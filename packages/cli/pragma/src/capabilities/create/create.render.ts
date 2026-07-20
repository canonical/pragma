/**
 * Formatters for `create` — plain / llm / json over a {@link GeneratorResult}.
 *
 * Deliberately free of any runtime summon-core (and any Ink) import: the
 * `GeneratorResult` type is imported type-only (erased), and the effect
 * inspection uses `@canonical/task`, which the kernel already loads. So a verb
 * spec carrying these formatters never pulls summon-core onto the
 * `buildProgram` / `--help` / `__complete` fast paths — and never pulls React.
 */

import type { GeneratorResult } from "@canonical/summon-core";
import { type Effect, getAffectedFiles } from "@canonical/task";
import type { Formatters } from "../../kernel/spec/types.js";

/** The user-visible mutating effects, de-duplicated by path for MakeDir. */
function created(effects: readonly Effect[]): string[] {
  return getAffectedFiles([...effects]);
}

/** The generation's outcome formatters. */
export const createFormatters: Formatters<GeneratorResult> = {
  plain(result) {
    const files = created(result.effects);
    const header = `Created with ${result.generator.meta.name} v${result.generator.meta.version}.`;
    if (files.length === 0) return header;
    return [header, ...files.map((file) => `  + ${file}`)].join("\n");
  },

  llm(result) {
    const files = created(result.effects);
    const lines = [
      `# create — ${result.generator.meta.name}`,
      "",
      `Generated ${files.length} path${files.length === 1 ? "" : "s"}:`,
      ...files.map((file) => `- \`${file}\``),
    ];
    return lines.join("\n");
  },

  json(result) {
    return JSON.stringify({
      generator: {
        name: result.generator.meta.name,
        version: result.generator.meta.version,
      },
      answers: result.answers,
      created: created(result.effects),
    });
  },
};
