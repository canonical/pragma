/**
 * Wires the `pragma trace clear` CLI command.
 *
 * Deletes all trace log files.
 */

import { readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { traceDir } from "../../refs/operations/paths.js";

const clearCommand: CommandDefinition = {
  path: ["trace", "clear"],
  description: "Delete all trace log files",
  parameters: [
    {
      name: "yes",
      description: "Skip confirmation",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: ["pragma trace clear", "pragma trace clear --yes"],
  },
  async execute(params) {
    const dir = traceDir();

    let entries: string[];
    try {
      entries = readdirSync(dir).filter((e) => e.endsWith(".ndjson"));
    } catch {
      return createOutputResult("No trace directory found.\n", {
        plain: (s) => s,
      });
    }

    if (entries.length === 0) {
      return createOutputResult("No trace files to delete.\n", {
        plain: (s) => s,
      });
    }

    if (params.yes !== true) {
      return createOutputResult(
        `Would delete ${entries.length} trace file${entries.length !== 1 ? "s" : ""}. Pass --yes to confirm.\n`,
        { plain: (s) => s },
      );
    }

    let deleted = 0;
    for (const entry of entries) {
      try {
        unlinkSync(join(dir, entry));
        deleted++;
      } catch {
        // Skip files we can't delete
      }
    }

    return createOutputResult(
      `Deleted ${deleted} trace file${deleted !== 1 ? "s" : ""}.\n`,
      { plain: (s) => s },
    );
  },
};

export default clearCommand;
