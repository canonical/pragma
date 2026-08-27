import { existsSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses, readMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";
import type { CheckItem, CheckResult } from "../types.js";
import { deriveBand } from "./deriveBand.js";

const NAME = "MCP commands";

/**
 * Extract the stdio EXECUTABLE from an MCP server config entry, if any.
 *
 * `command` arrives in two schema-legal shapes. Most harnesses take the scalar
 * (`command: "pragma"`, arguments in a sibling `args`), but OpenCode's
 * `McpLocalConfig` requires an ARRAY that fuses the two
 * (`command: ["pragma", "mcp"]` — see `opencodeMcpEntry` in
 * `@canonical/harnesses`). Reading only the scalar made this check step over
 * the array form entirely: doctor skipped the executable probe on an entry
 * `setup` had just written correctly, and a machine whose only MCP config is
 * OpenCode's reported "no command-based MCP servers configured" while being
 * fully configured. A silently wrong clean answer is worse than a loud wrong
 * one, so both shapes are read here.
 *
 * The executable is the FIRST non-empty string in either shape, so the two
 * yield the same answer for the same entry; the remaining array elements are
 * arguments and are not probed. HTTP/SSE entries (`{ type: "http", url }`)
 * have no command and are not checked.
 */
function commandOf(entry: unknown): string | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const command = (entry as { command?: unknown }).command;
  const executable = Array.isArray(command)
    ? command.find((part) => typeof part === "string" && part.length > 0)
    : command;
  return typeof executable === "string" && executable.length > 0
    ? executable
    : undefined;
}

/**
 * Resolve a command the way a shell would: a path-bearing entry is checked as a
 * file (relative to the project root), a bare name is searched across `PATH`.
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
 * Check that every command-based MCP server entry in detected harness configs
 * resolves to an executable. A dead entry makes every agent session try and
 * fail to boot it, so it is flagged with its config path.
 *
 * @param cwd - The project root to detect harnesses against.
 * @returns pass (all resolve), fail (listing broken entries), or skip (nothing
 *   to check).
 * @note Impure — detects harnesses, reads configs, and probes PATH/the fs.
 */
export async function checkMcpCommands(cwd: string): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(cwd));
  } catch {
    return { name: NAME, status: "skip", detail: "harness detection failed" };
  }

  const withConfig = detected.filter((d) => d.configExists);
  if (withConfig.length === 0) {
    return { name: NAME, status: "skip", detail: "no MCP configs found" };
  }

  // Band the finding by the harnesses whose configs were actually examined, so
  // a global-scope harness's broken command is reported under the global band.
  const band = deriveBand(withConfig);
  const broken: CheckItem[] = [];
  let checked = 0;

  for (const d of withConfig) {
    let servers: Record<string, unknown>;
    try {
      servers = await runTask(readMcpConfig(d.harness, cwd));
    } catch {
      continue; // The "MCP configured" check reports on unreadable configs.
    }

    for (const [serverName, entry] of Object.entries(servers)) {
      const command = commandOf(entry);
      if (!command) continue;
      checked += 1;
      if (!commandResolves(command, cwd)) {
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
      band,
    };
  }

  return {
    name: NAME,
    status: "fail",
    detail: `${broken.length} of ${checked} unresolvable`,
    items: broken,
    remedy:
      "Install the missing command or remove the entry — every agent session tries and fails to boot it.",
    band,
  };
}
