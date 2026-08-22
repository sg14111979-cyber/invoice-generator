#!/usr/bin/env node
/**
 * Double-click entry point: prepares the app if needed, builds it once, starts
 * the server and opens the browser. Keep the window open while using the app.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { prepare, run } from "./setup.mjs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const PORT = process.env.PORT ?? "3000";
const url = `http://localhost:${PORT}`;

function openBrowser() {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const args = process.platform === "win32" ? ["", url] : [url];
  spawnSync(command, args, { stdio: "ignore", shell: process.platform === "win32" });
}

prepare();

// A production build is only rebuilt when it is missing; delete .next to force one.
if (!existsSync(".next/BUILD_ID")) {
  run(npm, ["run", "build"]);
}

console.log(`\nStarting Invoice Studio on ${url}\nKeep this window open. Press Ctrl+C to stop.\n`);

const server = spawn(npm, ["run", "start", "--", "--port", PORT], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

setTimeout(openBrowser, 3000);

server.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => server.kill("SIGINT"));
