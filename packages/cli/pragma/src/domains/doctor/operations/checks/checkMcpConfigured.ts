/**
 * Check that at least one AI harness has pragma configured as an MCP server.
 * @note Impure — reads filesystem, detects harnesses.
 */

import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses, readMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task";
import type { CheckContext, CheckResult } from "../types.js";

export default async function checkMcpConfigured(
  ctx: CheckContext,
): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(ctx.cwd));
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

  const configured: string[] = [];
  for (const d of detected) {
    if (!d.configExists) continue;
    try {
      const servers = await runTask(readMcpConfig(d.harness, ctx.cwd));
      if ("pragma" in servers) {
        configured.push(d.harness.name);
      }
    } catch {
      // Config unreadable — skip
    }
  }

  if (configured.length > 0) {
    return {
      name: "MCP configured",
      status: "pass",
      detail: configured.join(", "),
    };
  }

  const names = detected.map((d) => d.harness.name).join(", ");
  return {
    name: "MCP configured",
    status: "fail",
    detail: `detected ${names} but pragma not configured`,
    remedy: "pragma setup mcp",
  };
}
