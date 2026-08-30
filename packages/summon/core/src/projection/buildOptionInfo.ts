/**
 * Derive the Commander option for one prompt — the single flag-shape authority
 * both binaries register from (moved verbatim from the summon bin's
 * registration layer).
 *
 * The shapes: a default-`true` confirm registers ONLY its `--no-<kebab>` form
 * (the positive state is the default and needs no flag); a default-`false`
 * confirm registers the positive `--<kebab>`; a select takes `<value>` with its
 * choices listed in the description; a multiselect takes a comma-separated
 * `<values>`; text takes `<value>`.
 *
 * NOTE: defaults are deliberately NOT passed to Commander (`defaultValue` stays
 * unset). Defaults are applied by `applyDefaults()` after answer extraction, so
 * the surface can distinguish "user didn't provide" from "user provided the
 * default value" — which is what keeps explicit answers explicit.
 */

import toKebabCase from "./kebab.js";
import type { OptionInfo, PromptLike } from "./types.js";

/**
 * Build the Commander option metadata for a prompt.
 *
 * @param prompt - The prompt (live or projected).
 * @returns The option's flags, help text, group and name mapping.
 */
export default function buildOptionInfo(prompt: PromptLike): OptionInfo {
  const kebabName = toKebabCase(prompt.name);
  const flagName = `--${kebabName}`;

  switch (prompt.type) {
    case "confirm": {
      const defaultVal = prompt.default === true;
      if (defaultVal) {
        return {
          flags: `--no-${kebabName}`,
          description: `${prompt.message}`,
          group: prompt.group,
          promptName: prompt.name,
          kebabName,
        };
      }
      return {
        flags: flagName,
        description: `${prompt.message}`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    case "select": {
      const choices = prompt.choices?.map((c) => c.value).join("|") ?? "";
      return {
        flags: `${flagName} <value>`,
        description: `${prompt.message} [${choices}]`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    case "multiselect": {
      return {
        flags: `${flagName} <values>`,
        description: `${prompt.message} (comma-separated)`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
    default: {
      return {
        flags: `${flagName} <value>`,
        description: `${prompt.message}`,
        group: prompt.group,
        promptName: prompt.name,
        kebabName,
      };
    }
  }
}
