/**
 * The generator→grammar adapter: map a summon {@link PromptDefinition} onto the
 * one grammar's {@link ParamSpec}, mirroring the v1 cli-core
 * `convertGenerator.promptToParameter`.
 *
 *   text        → { kind: "string" }   (+ positional; `complete: files` for paths)
 *   confirm     → { kind: "boolean" }
 *   select      → { kind: "enum", values: choices.map(value) }
 *   multiselect → { kind: "string[]", complete: values }
 *
 * `name→name`, `message→doc`, `default→default`, `positional→positional`;
 * `required = default === undefined && !when`. A prompt's `validate` and a
 * `select`'s choice set have NO ParamSpec slot: they are enforced by summon's
 * `validateAnswers` inside `execute`, so a flag/MCP-arg run rejects the same bad
 * input a wizard would. A `when` condition is honoured by `collectAnswers` at
 * prompt time. `generate` is reached through the verb's `run` → `execute`.
 *
 * This adapter runs over STATIC prompt mirrors (see `create.verb.ts`), never the
 * live generators — importing a generator runs a top-level `await loadTemplate`,
 * which must stay behind `create`'s lazy dispatch (R9). A parity test loads the
 * real generators and asserts the mirrors match.
 */

import type { PromptDefinition } from "@canonical/summon-core";
import type { ParamSpec } from "../../kernel/spec/types.js";

/** A path-like text prompt gets file completion. */
const looksLikePath = (name: string): boolean => /(path|dir)$/i.test(name);

/**
 * Derive a declarative param `doc` from a generator prompt's `message`.
 *
 * A prompt `message` is a wizard QUESTION (`Include styles?`, `Package name:`),
 * but a {@link ParamSpec.doc} is help text shown in CLI `--help` and the MCP
 * arg schema, where every other param reads as a declarative statement. We
 * DERIVE the doc rather than editing the mirrors' `message` — the generator
 * parity test couples `message` to the live generators, so the question must
 * stay verbatim for the interactive wizard while the flag/MCP doc reads well.
 * Strip the trailing `?`/`:` and end with a period.
 */
export function declarativeDoc(message: string): string {
  const trimmed = message
    .trim()
    .replace(/\s*[?:]+$/, "")
    .trim();
  if (trimmed === "") return trimmed;
  return /[.!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Convert one generator prompt to a grammar param.
 *
 * @param prompt - The generator's prompt definition.
 * @returns The equivalent {@link ParamSpec}.
 */
export function promptToParam(prompt: PromptDefinition): ParamSpec {
  const required = prompt.default === undefined && !prompt.when;
  const positional = prompt.positional === true;

  switch (prompt.type) {
    case "confirm":
      return {
        kind: "boolean",
        name: prompt.name,
        doc: declarativeDoc(prompt.message),
        required,
        positional,
        ...(prompt.default !== undefined
          ? { default: prompt.default as boolean }
          : {}),
      };
    case "select":
      return {
        kind: "enum",
        name: prompt.name,
        doc: declarativeDoc(prompt.message),
        values: (prompt.choices ?? []).map((choice) => choice.value),
        required,
        positional,
        ...(prompt.default !== undefined
          ? { default: String(prompt.default) }
          : {}),
      };
    case "multiselect":
      return {
        kind: "string[]",
        name: prompt.name,
        doc: declarativeDoc(prompt.message),
        required,
        positional,
        complete: { kind: "values" },
      };
    default:
      return {
        kind: "string",
        name: prompt.name,
        doc: declarativeDoc(prompt.message),
        required,
        positional,
        ...(prompt.default !== undefined ? { default: prompt.default } : {}),
        ...(looksLikePath(prompt.name) ? { complete: { kind: "files" } } : {}),
      };
  }
}

/** Map a generator's whole prompt list to grammar params, in order. */
export function generatorToParams(
  prompts: readonly PromptDefinition[],
): ParamSpec[] {
  return prompts.map(promptToParam);
}
