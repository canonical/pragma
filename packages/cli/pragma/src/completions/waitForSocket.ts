import { existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { POLL_INTERVAL_MS } from "./constants.js";

/**
 * Poll for a Unix socket file to appear on disk.
 *
 * Checks at `POLL_INTERVAL_MS` intervals until the file exists or
 * the timeout elapses.
 *
 * @param path - Absolute path to the expected socket file.
 * @param timeoutMs - Maximum time to wait in milliseconds.
 * @returns `true` if the socket appeared, `false` on timeout.
 *
 * @note Impure
 */
export default async function waitForSocket(
  path: string,
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(path)) return true;
    await setTimeout(POLL_INTERVAL_MS);
  }
  return false;
}
