import { prisma } from "./db";

/**
 * Minimal in-process, SQLite-persisted job runner. Concurrency = 1 so an 8GB GPU
 * is never asked to run two generations at once. Status lives in the DB, so a
 * page refresh never loses progress. This is intentionally simple and Redis-free.
 */

type Task = () => Promise<void>;

class SerialQueue {
  private running = false;
  private tasks: Task[] = [];

  enqueue(task: Task) {
    this.tasks.push(task);
    void this.drain();
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.tasks.length > 0) {
        const task = this.tasks.shift()!;
        try {
          await task();
        } catch (err) {
          // Task is responsible for persisting its own failure state; log here.
          console.error("[queue] task failed:", (err as Error).message);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

const globalForQueue = globalThis as unknown as { osseQueue?: SerialQueue };
export const queue = globalForQueue.osseQueue ?? new SerialQueue();
if (process.env.NODE_ENV !== "production") globalForQueue.osseQueue = queue;

/** Run a shot generation through the queue, persisting status transitions. */
export function enqueueShotJob(shotId: string, work: () => Promise<void>) {
  queue.enqueue(async () => {
    await prisma.shot.update({ where: { id: shotId }, data: { status: "running", errorMessage: null } });
    try {
      await work();
      await prisma.shot.update({ where: { id: shotId }, data: { status: "done" } });
    } catch (err) {
      await prisma.shot.update({
        where: { id: shotId },
        data: { status: "failed", errorMessage: (err as Error).message },
      });
      throw err;
    }
  });
}

/** Run an export render job through the queue, persisting status + progress. */
export function enqueueRenderJob(jobId: string, work: (onProgress: (p: number) => Promise<void>) => Promise<string>) {
  queue.enqueue(async () => {
    await prisma.renderJob.update({ where: { id: jobId }, data: { status: "running", progressPercent: 0, errorMessage: null } });
    try {
      const outputPath = await work(async (p) => {
        await prisma.renderJob.update({ where: { id: jobId }, data: { progressPercent: Math.max(0, Math.min(100, Math.round(p))) } });
      });
      await prisma.renderJob.update({ where: { id: jobId }, data: { status: "done", progressPercent: 100, outputPath } });
    } catch (err) {
      await prisma.renderJob.update({
        where: { id: jobId },
        data: { status: "failed", errorMessage: (err as Error).message },
      });
      throw err;
    }
  });
}
