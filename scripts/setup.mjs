#!/usr/bin/env node
/* One-shot setup: create .env from .env.example, ensure media dir, init DB. */
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

function step(msg, fn) {
  process.stdout.write(`• ${msg} … `);
  try { fn(); console.log("done"); }
  catch (e) { console.log("FAILED"); console.error(`   ${e.message}`); process.exitCode = 1; }
}

step("Create .env from .env.example", () => {
  if (!existsSync(".env")) {
    if (!existsSync(".env.example")) throw new Error(".env.example is missing");
    copyFileSync(".env.example", ".env");
  }
});

step("Ensure ./media directory exists", () => {
  mkdirSync("media", { recursive: true });
  mkdirSync("media/exports", { recursive: true });
});

step("Generate Prisma client", () => {
  execSync("npx prisma generate", { stdio: "inherit" });
});

step("Create / migrate SQLite database", () => {
  execSync("npx prisma db push", { stdio: "inherit" });
});

console.log("\nSetup complete. Next: `npm run check-env` then `npm run dev`.");
