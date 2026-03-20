import { createHash } from "node:crypto";
import { SOCKET_PREFIX } from "./constants.js";

/** Compute the Unix domain socket path for a project's completions server. */
export default function computeSocketPath(cwd: string): string {
  const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16);
  return `${SOCKET_PREFIX}${hash}.sock`;
}
