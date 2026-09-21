#!/usr/bin/env node
/**
 * Restores backend/docker/seed-data/local-dev-dump.sql into the running
 * duneinsolite-postgres container — a faster alternative to letting
 * Seed.java rebuild everything from scratch on the next backend startup.
 *
 * Piped through `docker exec -i ... psql` via spawn with stdio: ["pipe", ...]
 * rather than shell redirection (`docker exec -i ... < file.sql`), the same
 * reason scripts/mvn.mjs avoids raw shell strings on Windows — cmd.exe
 * redirection and quoting behave differently than POSIX shells, and this
 * way works identically on both without relying on either's redirect syntax.
 *
 *   node scripts/restore-dev-dump.mjs
 */

import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dumpFile = join(repoRoot, "backend", "src", "main", "resources", "seed-data", "local-dev-dump.sql");
const container = "duneinsolite-postgres";

if (!existsSync(dumpFile)) {
  console.error(`No dump file found at ${dumpFile}`);
  process.exit(1);
}

console.log(`Restoring ${dumpFile} into ${container}...`);

const psql = spawn(
  "docker",
  ["exec", "-i", container, "psql", "-U", "postgres", "-d", "duneinsolite", "-v", "ON_ERROR_STOP=1"],
  { stdio: ["pipe", "inherit", "inherit"] }
);

psql.on("error", (err) => {
  console.error(`Failed to run docker exec: ${err.message}`);
  console.error(`Is Docker Desktop running, and is the ${container} container up?`);
  process.exit(1);
});

const fileStream = createReadStream(dumpFile);
fileStream.pipe(psql.stdin);
fileStream.on("error", (err) => {
  console.error(`Failed to read dump file: ${err.message}`);
  process.exit(1);
});

psql.on("exit", (code, signal) => {
  if (signal) {
    console.error(`psql terminated by signal ${signal}`);
    process.exit(1);
  }
  if (code !== 0) {
    console.error(`psql exited with code ${code}`);
    process.exit(code ?? 1);
  }
  console.log("Restore complete.");
});
