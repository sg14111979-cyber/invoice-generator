#!/usr/bin/env node
/**
 * Prepares the app: writes a local .env if missing, installs dependencies and
 * applies database migrations. Safe to run repeatedly. Used by `npm run setup`
 * and by the double-click launchers via start.mjs.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

export function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`\nFailed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

export function ensureEnv() {
  if (existsSync(".env")) return;
  writeFileSync(
    ".env",
    [
      "# Local configuration. Keep this file private; it is not committed to git.",
      'DATABASE_URL="file:./dev.db"',
      `SESSION_SECRET="${randomBytes(32).toString("hex")}"`,
      "",
      "# Optional: pre-create the owner account instead of using the setup screen.",
      '# ADMIN_EMAIL="you@yourbusiness.com"',
      '# ADMIN_PASSWORD="at-least-8-characters"',
      '# ADMIN_NAME="Your Name"',
      "",
    ].join("\n"),
    "utf8",
  );
  console.log("Created .env with a fresh session secret.");
}

export function prepare() {
  ensureEnv();
  run(npm, ["install"]);
  run(npx, ["prisma", "migrate", "deploy"]);
  run(npm, ["run", "db:seed"]);
}

// Only prepare when executed directly (start.mjs imports and reuses these).
if (import.meta.url === `file://${process.argv[1]}`) {
  prepare();
  console.log("\nReady. Start the app with:  npm run dev\n");
}
