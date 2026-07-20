import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses, readMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";
import type { CheckResult } from "../types.js";
import { deriveBand } from "./deriveBand.js";

/**
 * Check that at least one AI harness has pragma configured as an MCP server. The
 * result's band is derived from the harnesses actually found (Windsurf ⇒ global,
 * Cursor ⇒ project), not the check name — so a global-scope harness is not
 * mislabeled PROJECT.
 *
 * @param cwd - The project root to detect harnesses against.
 * @returns A CheckResult listing configured harnesses, or fail with a remedy.
 * @note Impure — detects harnesses and reads their MCP configs.
 */
export async function checkMcpConfigured(cwd: string): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(cwd));
  } catch {
    return {
      name: "MCP configured",
      status: "fail",
      detail: "harness detection failed",
      remedy: "pragma setup mcp",
    };
  }

  if (detected.length === 0) {
    return {
      name: "MCP configured",
      status: "fail",
      detail: "no AI harnesses detected",
      remedy: "pragma setup mcp",
    };
  }

  const configured: DetectedHarness[] = [];
  for (const d of detected) {
    if (!d.configExists) continue;
    try {
      const servers = await runTask(readMcpConfig(d.harness, cwd));
      if ("pragma" in servers) configured.push(d);
    } catch {
      // Config unreadable — skip.
    }
  }

  if (configured.length > 0) {
    return {
      name: "MCP configured",
      status: "pass",
      detail: configured.map((d) => d.harness.name).join(", "),
      band: deriveBand(configured),
    };
  }

  const names = detected.map((d) => d.harness.name).join(", ");
  return {
    name: "MCP configured",
    status: "fail",
    detail: `detected ${names} but pragma not configured`,
    remedy: "pragma setup mcp",
    band: deriveBand(detected),
  };
}
