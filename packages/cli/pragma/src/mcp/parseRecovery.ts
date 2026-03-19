/**
 * Parse a CLI recovery string into a structured MCP recovery object.
 *
 * Handles patterns like:
 * - `"Run \`pragma component list\` to see available components."`
 * - `"pragma component list --all-tiers"`
 */

import { FLAG_MAP } from "./constants.js";
import type { McpRecovery } from "./types.js";

function parseRecovery(recovery: string): McpRecovery | undefined {
  const backtickMatch = recovery.match(/`(pragma\s+[^`]+)`/);
  const command = backtickMatch?.[1] ?? recovery;

  const match = command.match(/^pragma\s+(\S+)\s+(\S+)(.*)$/);
  if (!match) return undefined;

  const [, noun, verb, flagStr] = match;
  const tool = `${noun}_${verb}`;
  const params: Record<string, unknown> = {};

  if (flagStr) {
    for (const [flag, [param, value]] of Object.entries(FLAG_MAP)) {
      if (flagStr.includes(flag)) {
        params[param] = value;
      }
    }
  }

  return {
    tool,
    params,
    description: backtickMatch
      ? recovery
          .replace(/`[^`]+`/, "")
          .replace(/^Run\s+/, "")
          .trim() || `List available ${noun}s`
      : `Run pragma ${noun} ${verb}`,
  };
}

export { parseRecovery };
