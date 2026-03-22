import { createHash } from "node:crypto";
import { SOCKET_PREFIX } from "./constants.js";

/**
 * Compute the Unix domain socket path for a project's completions server.
 *
 * Derives a deterministic path from a SHA-256 hash of the working directory
 * so each project gets its own completions server socket.
 *
 * @param cwd - The project working directory to hash.
 * @returns The absolute socket file path under `/tmp/`.
 */
export default function computeSocketPath(cwd: string): string {
  const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16);
  return `${SOCKET_PREFIX}${hash}.sock`;
}
