import type { Formatters } from "../../shared/formatters.js";
import { renderLookupLlm, renderLookupPlain } from "../../shared/renderers.js";
import type { TokenDetailed } from "../../shared/types/index.js";
import { tokenConfig } from "../tokenConfig.js";

/** Options controlling detail level for the token-lookup formatter. */
interface TokenLookupFormatterOptions {
  readonly detailed: boolean;
}

/**
 * Create a three-mode formatter set for a single token.
 *
 * Captures the detail level in the closure so callers only pass the token data.
 *
 * @param options - detail-level options
 * @returns plain/llm/json formatters for {@link TokenDetailed}
 */
export default function createLookupFormatters(
  options: TokenLookupFormatterOptions,
): Formatters<TokenDetailed> {
  const { detailed } = options;
  const sections = detailed ? tokenConfig.lookupSections : [];

  return {
    plain: (token) =>
      renderLookupPlain(token, {
        title: (entry) => entry.name,
        fields: [
          { label: "URI", value: (entry) => entry.uri },
          { label: "Category", value: (entry) => entry.category || "—" },
        ],
        sections,
        sectionOverrides: {
          values: {
            plain: (entry) =>
              entry.values.length > 0
                ? entry.values
                    .map((value) => `  ${value.theme}: ${value.value}`)
                    .join("\n")
                : null,
            llm: (entry) =>
              entry.values.length > 0
                ? entry.values
                    .map((value) => `- ${value.theme}: \`${value.value}\``)
                    .join("\n")
                : null,
          },
        },
      }),

    llm: (token) =>
      renderLookupLlm(token, {
        title: (entry) => entry.name,
        fields: [
          { label: "URI", value: (entry) => entry.uri },
          { label: "Category", value: (entry) => entry.category || "—" },
        ],
        sections,
        sectionOverrides: {
          values: {
            plain: (entry) =>
              entry.values.length > 0
                ? entry.values
                    .map((value) => `  ${value.theme}: ${value.value}`)
                    .join("\n")
                : null,
            llm: (entry) =>
              entry.values.length > 0
                ? entry.values
                    .map((value) => `- ${value.theme}: \`${value.value}\``)
                    .join("\n")
                : null,
          },
        },
      }),

    json: (token) => {
      if (detailed) {
        return JSON.stringify(token, null, 2);
      }
      const { values: _values, ...summary } = token;
      return JSON.stringify(summary, null, 2);
    },
  };
}
