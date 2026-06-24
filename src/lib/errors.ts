import { NextResponse } from "next/server";

/** A user-facing error with a specific, actionable message. */
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

/** Wrap a route handler so thrown errors become clean JSON responses. */
export function handle(fn: () => Promise<NextResponse>) {
  return fn().catch((err: unknown) => {
    const message =
      err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Unexpected error";
    const status = err instanceof AppError ? err.status : 500;
    // Never a silent failure: always return a specific message.
    return NextResponse.json({ error: message }, { status });
  });
}
