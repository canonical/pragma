/**
 * `pragma setup mcp` — configure MCP server for detected AI harnesses.
 *
 * Detects installed harnesses (Claude Code, Cursor, etc.), prompts for
 * each, and writes the pragma MCP server entry into their config files.
 * When a harness ID is forced, detection is bypassed.
 */

import type { McpServerConfig } from "@canonical/harnesses";
import {
  detectHarnesses,
  findHarnessById,
  writeMcpConfig,
} from "@canonical/harnesses";
import {
  $,
  gen,
  info,
  promptConfirm,
  type Task,
  traverse_,
  warn,
  when,
} from "@canonical/task";
import { MCP_SERVER_NAME } from "../helpers/constants.js";

/**
 * Build the pragma MCP server config for a project root.
 */
function pragmaMcpConfig(root: string): McpServerConfig {
  return { command: "pragma", args: ["mcp"], cwd: root };
}

/**
 * Compose a Task that configures the pragma MCP server for detected
 * (or forced) AI harnesses.
 *
 * @param root - Project root directory.
 * @param forceHarnessId - If set, bypass detection and configure this harness only.
 */
export default function setupMcp(
  root: string,
  forceHarnessId?: string,
): Task<void> {
  return gen(function* () {
    // Force mode: bypass detection
    if (forceHarnessId) {
      const harness = findHarnessById(forceHarnessId);
      if (!harness) {
        yield* $(warn(`Unknown harness: ${forceHarnessId}`));
        return;
      }
      yield* $(
        writeMcpConfig(harness, root, MCP_SERVER_NAME, pragmaMcpConfig(root)),
      );
      yield* $(
        info(`✓ pragma MCP server added to ${harness.configPath(root)}`),
      );
      return;
    }

    // Detection mode
    const detected = yield* $(detectHarnesses(root));

    if (detected.length === 0) {
      yield* $(
        warn(
          "No AI harnesses detected. Use --claude-code, --cursor, or --windsurf to configure manually.",
        ),
      );
      return;
    }

    yield* $(
      info(
        `Detected harness${detected.length > 1 ? "es" : ""}: ${detected.map((d) => d.harness.name).join(", ")}`,
      ),
    );

    yield* $(
      traverse_(detected, (d) =>
        gen(function* () {
          const confirmed = yield* $(
            promptConfirm(
              `setup-mcp-${d.harness.id}`,
              `Configure pragma MCP for ${d.harness.name}?`,
              true,
            ),
          );
          yield* $(
            when(
              confirmed,
              gen(function* () {
                yield* $(
                  writeMcpConfig(
                    d.harness,
                    root,
                    MCP_SERVER_NAME,
                    pragmaMcpConfig(root),
                  ),
                );
                yield* $(info(`✓ pragma MCP server added to ${d.configPath}`));
              }),
            ),
          );
        }),
      ),
    );
  });
}
