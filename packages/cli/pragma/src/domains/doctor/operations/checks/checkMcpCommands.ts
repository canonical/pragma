import { existsSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses, readMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";
import type { CheckContext, CheckItem, CheckResult } from "../types.js";

const NAME = "MCP commands";

/**
 * Extract the stdio command from an MCP server config entry, if any.
 * HTTP/SSE entries (e.g. `{ "type": "http", "url": ... }`) have no command
 * and are not checked.
 *
 * @param entry - Raw server entry from a harness MCP config.
 * @returns The command string, or `undefined` when the entry is not
 *   command-based.
 */
function commandOf(entry: unknown): string | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const command = (entry as { command?: unknown }).command;
  return typeof command === "string" && command.length > 0
    ? command
    : undefined;
}

/**
 * Resolve a command the way a shell would: entries containing a path
 * separator are checked as file paths (relative to the project root),
 * bare names are searched across `PATH`.
 *
 * @param command - Command string from an MCP server entry.
 * @param cwd - Project root for resolving relative paths.
 * @returns Whether the command resolves to an existing file.
 * @note Impure — reads `process.env.PATH` and the filesystem.
 */
function commandResolves(command: string, cwd: string): boolean {
  if (command.includes("/") || command.includes("\\")) {
    return existsSync(isAbsolute(command) ? command : join(cwd, command));
  }

  return (process.env.PATH ?? "")
    .split(delimiter)
    .filter((dir) => dir.length > 0)
    .some((dir) => existsSync(join(dir, command)));
}

/**
 * Check that every command-based MCP server entry in detected harness
 * configs resolves to an executable. A dead entry (e.g. a leftover server
 * whose binary was never installed) makes every agent session try and fail
 * to boot it, so it is flagged with the offending config path.
 *
 * @param ctx - Check context with the working directory.
 * @returns A CheckResult: pass when all commands resolve, fail listing the
 *   broken entries, or skip when there is nothing to check.
 * @note Impure
 */
export default async function checkMcpCommands(
  ctx: CheckContext,
): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(ctx.cwd));
  } catch {
    return {
      name: NAME,
      status: "skip",
      detail: "harness detection failed",
    };
  }

  const withConfig = detected.filter((d) => d.configExists);
  if (withConfig.length === 0) {
    return {
      name: NAME,
      status: "skip",
      detail: "no MCP configs found",
    };
  }

  const broken: CheckItem[] = [];
  let checked = 0;

  for (const d of withConfig) {
    let servers: Record<string, unknown>;
    try {
      servers = await runTask(readMcpConfig(d.harness, ctx.cwd));
    } catch {
      // Config unreadable — the "MCP configured" check reports on this.
      continue;
    }

    for (const [serverName, entry] of Object.entries(servers)) {
      const command = commandOf(entry);
      if (!command) continue;

      checked += 1;
      if (!commandResolves(command, ctx.cwd)) {
        broken.push({
          label: `"${serverName}"`,
          status: "fail",
          detail: `"${command}" not found · ${d.configPath}`,
        });
      }
    }
  }

  if (checked === 0) {
    return {
      name: NAME,
      status: "skip",
      detail: "no command-based MCP servers configured",
    };
  }

  if (broken.length === 0) {
    return {
      name: NAME,
      status: "pass",
      detail: `${checked} command${checked === 1 ? "" : "s"} resolve on PATH`,
    };
  }

  return {
    name: NAME,
    status: "fail",
    detail: `${broken.length} of ${checked} unresolvable`,
    items: broken,
    remedy:
      "Install the missing command or remove the entry from the MCP config — every agent session tries and fails to boot it.",
  };
}
