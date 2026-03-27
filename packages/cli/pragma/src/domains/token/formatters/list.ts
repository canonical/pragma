import type { Formatters } from "../../shared/formatters.js";
import { renderListLlm } from "../../shared/renderers.js";
import type { TokenSummary } from "../../shared/types/index.js";
import { tokenConfig } from "../tokenConfig.js";

/** Three-mode formatter for `pragma token list` output. */
const formatters: Formatters<TokenSummary[]> = {
  plain: (tokens) =>
    tokens
      .map((token) =>
        token.category ? `${token.name} [${token.category}]` : token.name,
      )
      .join("\n"),

  llm: (tokens) =>
    renderListLlm(tokens, {
      heading: "Design Tokens",
      columns: tokenConfig.listColumns,
    }),

  json: (tokens) => JSON.stringify(tokens, null, 2),
};

export default formatters;
