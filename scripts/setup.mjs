#!/usr/bin/env node
/**
 * One-command setup: creates .env if missing (asking for the admin login),
 * installs dependencies, applies migrations and seeds the admin user.
 * Run with `npm run setup`.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`\nFailed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

async function ensureEnv() {
  if (existsSync(".env")) {
    console.log(".env already exists — keeping it.");
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  console.log("Setting up your administrator login (stored only in your local .env).\n");

  let email = "";
  while (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    email = (await rl.question("Admin email: ")).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) console.log("  Enter a valid email address.");
  }

  let password = "";
  while (password.length < 8) {
    password = (await rl.question("Admin password (min 8 characters): ")).trim();
    if (password.length < 8) console.log("  Too short — at least 8 characters.");
  }

  const nameAnswer = (await rl.question("Your name [Studio Admin]: ")).trim();
  await rl.close();

  writeFileSync(
    ".env",
    [
      'DATABASE_URL="file:./dev.db"',
      `SESSION_SECRET="${randomBytes(32).toString("hex")}"`,
      `ADMIN_EMAIL="${email}"`,
      `ADMIN_PASSWORD="${password}"`,
      `ADMIN_NAME="${nameAnswer || "Studio Admin"}"`,
      "",
    ].join("\n"),
    "utf8",
  );
  console.log("\nWrote .env (it is git-ignored).");
}

await ensureEnv();
run(npm, ["install"]);
run(npx, ["prisma", "migrate", "deploy"]);
run(npm, ["run", "db:seed"]);

console.log("\nSetup complete. Start the app with:\n\n  npm run dev\n\nThen open http://localhost:3000 and sign in with the admin email and password above.");
