#!/usr/bin/env node
/**
 * Cross-platform Maven wrapper dispatcher.
 *
 * `npm run backend:*` from the repo root has to work on Windows, macOS and
 * Linux. npm runs scripts through cmd.exe on Windows and sh elsewhere, so a
 * literal `cd backend && ./mvnw` breaks on one or the other — `./mvnw` is not
 * executable from cmd, and `mvnw.cmd` does not exist off Windows.
 *
 * This picks the right wrapper for the platform, runs it in backend/, and
 * forwards the process exit code so CI and `npm run verify` fail correctly.
 *
 *   node scripts/mvn.mjs -q compile
 *   node scripts/mvn.mjs test
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = join(repoRoot, "backend");

const isWindows = process.platform === "win32";
const wrapper = join(backendDir, isWindows ? "mvnw.cmd" : "mvnw");

if (!existsSync(wrapper)) {
  console.error(`No Maven wrapper found at ${wrapper}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/mvn.mjs <maven goals and flags>");
  process.exit(1);
}

// shell:true on Windows because Node cannot spawn a .cmd directly. With a
// shell, the command string is handed to cmd.exe verbatim — so the path must
// be quoted itself, or a directory containing a space (as this repo's does)
// splits into two tokens and cmd reports "not recognized as an internal or
// external command".
//
// Arguments here come from package.json scripts and the developer's own
// command line, never from untrusted input.
const command = isWindows ? `"${wrapper}"` : wrapper;

const child = spawn(command, args, {
  cwd: backendDir,
  stdio: "inherit",
  shell: isWindows,
});

child.on("error", (err) => {
  console.error(`Failed to run the Maven wrapper: ${err.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Maven terminated by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
