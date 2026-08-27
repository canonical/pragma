/**
 * Formatters for `create` — plain / llm / json over a {@link GeneratorResult},
 * plus the dry-run plan render.
 *
 * Free of any RUNTIME summon-core import, and of any Ink import: the
 * `GeneratorResult` type is imported type-only (erased) and the effect
 * inspection uses `@canonical/task`, which the kernel already loads. This
 * module sits on the capabilities barrel, so `--help` and `__complete` pay its
 * import cost on every spawn — the same reason `create.verb.ts` keeps even the
 * UI-free projection subpath off its static graph. So a verb spec carrying
 * these formatters never pulls summon-core onto the `buildProgram` / `--help`
 * / `__complete` fast paths, and never pulls React.
 *
 * The plan render matters because pragma and summon scaffold through the SAME
 * projection: the two bins write byte-identical trees, so a preview that
 * described that work differently in each was a difference with nothing behind
 * it. {@link formatCreatePlan} therefore consumes summon's own rules rather
 * than restating them — the rows, the connectors and the closing line are
 * whatever `@canonical/summon-core/format` says they are.
 */

import type { GeneratorResult } from "@canonical/summon-core";
import { type Effect, getAffectedFiles } from "@canonical/task";
import type { Formatters } from "../../kernel/spec/types.js";

/** The user-visible mutating effects, de-duplicated by path for MakeDir. */
function created(effects: readonly Effect[]): string[] {
  return getAffectedFiles([...effects]);
}

/**
 * Render a `create --dry-run` plan: the generation summon would describe.
 *
 * The kernel's default render dumps every effect the interpreter recorded,
 * which for a generator means the internal `Exists` probes, the output
 * directory once per file it holds, and the generator's own log lines — a
 * transcript rather than a plan. {@link visiblePlanEffects} is the filter that
 * already exists for exactly this, and {@link formatEffectLine} the row.
 *
 * Nothing is stashed on the runtime for this: a generator's plan is not known
 * until the preview interpreter has walked the Task, so the effects ARE the
 * plan data. That also keeps `--dry-run --format json` untouched, since the
 * kernel adds its `targets` key only for a verb that stashed something.
 *
 * ASYNC because the formatter is loaded LAZILY, from the light `/format`
 * subpath — the same dynamic edge `registerVerb.ts` uses for the MCP plan
 * payload, so both surfaces reach one module and neither puts it on the fast
 * paths. A dry run is already several filesystem reads deep by the time this
 * is called; a `--help` spawn never calls it at all.
 *
 * @param effects - The effects the previewed run recorded, in order.
 * @param verbose - If true, the generator's debug logs stay in the plan.
 * @returns The rendered plan, without a trailing newline.
 */
export async function formatCreatePlan(
  effects: readonly Effect[],
  verbose: boolean,
): Promise<string> {
  const { formatEffectLine, visiblePlanEffects } = await import(
    "@canonical/summon-core/format"
  );
  const rows = visiblePlanEffects(effects, verbose);
  return [
    "Plan:",
    ...rows.map((effect, index) =>
      formatEffectLine(effect, index === rows.length - 1),
    ),
    "",
    "Dry-run complete. No files were modified.",
  ].join("\n");
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
