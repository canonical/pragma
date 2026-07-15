import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import computeSocketPath from "./computeSocketPath.js";
import { SPAWN_TIMEOUT_MS } from "./constants.js";
import querySocket from "./querySocket.js";
import waitForSocket from "./waitForSocket.js";

/**
 * Client entry point for shell tab completion.
 *
 * Checks for a running completions server, spawns one if absent,
 * connects via Unix socket, and prints candidates to stdout.
 * Designed to be called by `pragma --completions <partial>`.
 * Fails silently on error — shell completion must never block the terminal.
 *
 * @param partial - The partial CLI input to complete.
 *
 * @note Impure
 */
export default async function queryCompletions(partial: string): Promise<void> {
  const socketPath = computeSocketPath(process.cwd());

  // Try an existing server first.
  if (existsSync(socketPath)) {
    try {
      const response = await querySocket(socketPath, partial);
      if (response.length > 0) {
        process.stdout.write(`${response}\n`);
      }
      return;
    } catch {
      // Stale socket from a crashed server — clean up and spawn fresh.
      try {
        unlinkSync(socketPath);
      } catch {
        // Socket may have been removed concurrently.
      }
    }
  }

  // No running server — spawn one. Re-invoke THIS executable so completion
  // works from the shipped binary as well as from source: when the entry file
  // exists on disk (source run) spawn `bun run bin.ts`; otherwise (a compiled
  // standalone binary, where bin.ts is embedded, not a file) spawn the binary
  // itself. The old code always spawned `bun run <dir>/../bin.ts`, which does
  // not exist inside a compiled binary, so its server never started and every
  // completion silently returned nothing.
  const entryPath = resolve(import.meta.dirname, "../bin.ts");
  const spawnArgs = existsSync(entryPath)
    ? [process.execPath, "run", entryPath, "_completions-server"]
    : [process.execPath, "_completions-server"];
  Bun.spawn(spawnArgs, {
    stdio: ["ignore", "ignore", "ignore"],
    cwd: process.cwd(),
  });

  const ready = await waitForSocket(socketPath, SPAWN_TIMEOUT_MS);
  if (!ready) {
    return;
  }

  try {
    const response = await querySocket(socketPath, partial);
    if (response.length > 0) {
      process.stdout.write(`${response}\n`);
    }
  } catch {
    // Silent — shell completion must never signal failure.
  }
}
