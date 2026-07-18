/**
 * `setup mcp` — register the pragma MCP server in detected AI harnesses.
 *
 * Detection (`detectHarnesses`) runs FOR REAL in the async-setup phase (via
 * `runTask`, safe reads), so a `--dry-run` preview describes writes against the
 * TRUE harness set — not the empty set a dry-run of the detection Task would
 * report. Each write is gated by a `promptConfirm` (resolved interactively on an
 * attended TTY, auto-confirmed under `--yes`/MCP). The covenant sub-verb carries
 * no force-flags, so the old `--claude-code`/`--cursor`/`--windsurf` selectors
 * are dropped — detection only.
 */

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
import { MCP_SERVER_NAME } from "../../../constants.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { applyPromptStrategy } from "../promptStrategy.js";
import type { SetupResult } from "../types.js";

/**
 * Build the `setup mcp` Task.
 *
 * @param rt - The per-invocation runtime.
 * @returns A Task that (per confirmed harness) writes the pragma MCP config.
 * @note Impure — detects harnesses (real) and composes config writes.
 */
export async function setupMcp(rt: PragmaRuntime): Promise<Task<SetupResult>> {
  applyPromptStrategy(rt);
  const cwd = rt.cwd;
  const [{ detectHarnesses, writeMcpConfig }, { runTask }] = await Promise.all([
    import("@canonical/harnesses"),
    import("@canonical/task/node"),
  ]);
  const detected = await runTask(detectHarnesses(cwd));

  if (detected.length === 0) {
    return gen(function* () {
      yield* $(warn("No AI harnesses detected — nothing to configure."));
      return { kind: "mcp" as const, configured: [] };
    });
  }

  const pragmaMcpConfig = { command: "pragma", args: ["mcp"], cwd };
  const configured: string[] = [];

  return gen(function* () {
    yield* $(
      info(`Detected: ${detected.map((d) => d.harness.name).join(", ")}`),
    );
    yield* $(
      traverse_(detected, (d) =>
        gen(function* () {
          const ok = yield* $(
            promptConfirm(
              `setup-mcp-${d.harness.id}`,
              `Configure pragma MCP for ${d.harness.name}?`,
              true,
            ),
          );
          yield* $(
            when(
              ok,
              gen(function* () {
                yield* $(
                  writeMcpConfig(
                    d.harness,
                    cwd,
                    MCP_SERVER_NAME,
                    pragmaMcpConfig,
                  ),
                );
                yield* $(info(`✓ pragma MCP server added to ${d.configPath}`));
                configured.push(d.harness.name);
              }),
            ),
          );
        }),
      ),
    );
    return { kind: "mcp" as const, configured };
  });
}
