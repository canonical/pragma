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
import { isAbsolute, join } from "node:path";
import type { PlatformEnv } from "@canonical/harnesses";

/**
 * Extract the stdio command from an MCP server config entry, if any. HTTP/SSE
 * entries (`{ type: "http", url }`) have no command and are not checked.
 *
 * Both entry shapes resolve to the same executable. A harness whose schema
 * requires `command` to be an argv array (OpenCode) carries the executable in
 * its first element; a string-valued `command` IS the executable. Reading only
 * the string form made this check skip an entry `setup` had just written
 * correctly, and report no command-based servers on a configured machine.
 */
export function commandOf(entry: unknown): string | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const command = (entry as { command?: unknown }).command;
  if (typeof command === "string") {
    return command.length > 0 ? command : undefined;
  }
  if (Array.isArray(command)) {
    return command.find(
      (part): part is string => typeof part === "string" && part.length > 0,
    );
  }
  return undefined;
}

/**
 * Resolve a command the way the host would: a path-bearing entry is checked as
 * a file (relative to the project root), a bare name is searched across `PATH`
 * through `@canonical/harnesses`' `executableCandidates`, which owns the PATH
 * split and the win32 `PATHEXT` rules in one place.
 *
 * The bare-name arm used to join the name onto each PATH directory, which
 * cannot see the `.cmd` shim npm installs on Windows: a registration this CLI
 * had just written correctly was reported as a dead command.
 *
 * @param command - The executable the entry names.
 * @param cwd - The project root a relative command is resolved against.
 * @param platform - The captured host to use instead of this one (tests).
 * @returns Whether the command resolves on this machine.
 * @note Impure — tests candidate paths on the filesystem.
 */
export async function commandResolves(
  command: string,
  cwd: string,
  platform?: PlatformEnv,
): Promise<boolean> {
  if (command.includes("/") || command.includes("\\")) {
    return existsSync(isAbsolute(command) ? command : join(cwd, command));
  }
  const { executableCandidates, readPlatformEnv } = await import(
    "@canonical/harnesses"
  );
  return executableCandidates(command, platform ?? readPlatformEnv()).some(
    (candidate) => existsSync(candidate),
  );
}
