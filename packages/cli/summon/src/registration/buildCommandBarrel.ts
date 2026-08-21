/**
 * Build a flat command list from a generator tree — the summon host over the
 * shared builder in `@canonical/summon-core/projection`. The host contributes
 * the two seams the core deliberately does not own: HOW a generator loads
 * (this bin's cache-aware dynamic import) and how a load failure is reported
 * (a chalk warning; the command is skipped, the rest still register).
 *
 * @note Impure — loads generators via dynamic import, warns on stderr.
 */

import type { GeneratorNode } from "@canonical/summon-core";
import { buildCommandBarrel as coreBuildCommandBarrel } from "@canonical/summon-core/projection";
import chalk from "chalk";
import { loadGenerator } from "../discovery/index.js";
import type { CommandEntry } from "./types.js";

export default async function buildCommandBarrel(
  node: GeneratorNode,
): Promise<CommandEntry[]> {
  return coreBuildCommandBarrel(node, {
    loadGenerator,
    onLoadError: (name, err) => {
      console.error(
        chalk.yellow(`Warning: Could not load generator '${name}':`),
        err.message,
      );
    },
  });
}
