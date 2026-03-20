/**
 * Client entry point for shell tab completion.
 *
 * Checks for a running completions server, spawns one if absent,
 * connects via Unix socket, and prints candidates to stdout.
 * Designed to be called by `pragma --completions <partial>`.
 * Fails silently on error — shell completion must never block the terminal.
 *
 * @note Impure — spawns processes, connects to sockets, writes to stdout.
 */

import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import computeSocketPath from "./computeSocketPath.js";
import { SPAWN_TIMEOUT_MS } from "./constants.js";
import querySocket from "./querySocket.js";
import waitForSocket from "./waitForSocket.js";

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

  // No running server — spawn one.
  const binPath = resolve(import.meta.dirname, "../bin.ts");
  Bun.spawn(["bun", "run", binPath, "_completions-server"], {
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
