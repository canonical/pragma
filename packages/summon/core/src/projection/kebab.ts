/**
 * THE kebab-case derivation for prompt names — the one function every flag
 * name, refusal list, and validation message derives `--component-path` from
 * `componentPath` with. It used to exist as three private copies (the summon
 * bin's registration, `execute/validateAnswers`, `prompt/autoPrompt`); a
 * message and a flag that disagree about the same prompt's spelling is the
 * defect a single authoring point removes.
 */

/**
 * Convert a camelCase prompt name to its kebab-case CLI flag form.
 *
 * @param name - The prompt name (`withTests`, `componentPath`).
 * @returns The kebab-case form (`with-tests`, `component-path`).
 */
export default function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
