/**
 * Command resolution for MCP server entries.
 *
 * A dead `command` makes every agent session try and fail to boot the server,
 * so the `mcp` doctor row reports whether the entry it owns resolves. The row
 * judges ONLY the entry this CLI writes: an aggregate check over every server
 * in the file failed the row whenever some FOREIGN server had a dead command,
 * which is a fact about someone else's tool reported as this one's fault.
 */

import { existsSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

/**
 * Extract the stdio command from an MCP server config entry, if any. HTTP/SSE
 * entries (`{ type: "http", url }`) have no command and are not checked.
 */
export function commandOf(entry: unknown): string | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const command = (entry as { command?: unknown }).command;
  return typeof command === "string" && command.length > 0
    ? command
    : undefined;
}

/**
 * Resolve a command the way a shell would: a path-bearing entry is checked as a
 * file (relative to the project root), a bare name is searched across `PATH`.
 */
export function commandResolves(command: string, cwd: string): boolean {
  if (command.includes("/") || command.includes("\\")) {
    return existsSync(isAbsolute(command) ? command : join(cwd, command));
  }
  return (process.env.PATH ?? "")
    .split(delimiter)
    .filter((dir) => dir.length > 0)
    .some((dir) => existsSync(join(dir, command)));
}
