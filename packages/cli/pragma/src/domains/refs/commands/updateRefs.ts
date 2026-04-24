/**
 * CLI command: pragma update-refs
 *
 * Fetches/clones git-referenced semantic packages into the local cache.
 * Store-skip command — does not boot the ke store.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import formatUpdateResults from "../formatters/updateRefs.js";
import updateRefs from "../operations/updateRefs.js";

const updateRefsCommand: CommandDefinition = {
  path: ["update-refs"],
  description:
    "Fetch or clone git-referenced semantic packages into the local cache",
  parameters: [
    {
      name: "package",
      description: "Update only this package (by name)",
      type: "string",
    },
    {
      name: "prune",
      description:
        "Remove orphaned cache entries that no longer match any configured ref",
      type: "boolean",
      default: false,
    },
  ],
  meta: {
    examples: [
      "pragma update-refs",
      "pragma update-refs --package @canonical/design-system",
      "pragma update-refs --prune",
    ],
  },
  execute: async (params, ctx) => {
    const results = await updateRefs({
      cwd: ctx.cwd,
      package: params.package as string | undefined,
      prune: params.prune === true,
    });

    const text = formatUpdateResults(results);
    process.stdout.write(`${text}\n`);

    const hasErrors = results.some((r) => r.kind === "error");
    return { tag: "exit" as const, code: hasErrors ? 1 : 0 };
  },
};

export default updateRefsCommand;
