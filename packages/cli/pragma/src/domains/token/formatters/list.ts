import type { Formatters } from "../../shared/formatters.js";
import type { TokenSummary } from "../../shared/types.js";

const formatters: Formatters<TokenSummary[]> = {
  plain: (tokens) => {
    const lines: string[] = [];
    for (const t of tokens) {
      const cat = t.category ? ` [${t.category}]` : "";
      lines.push(`${t.name}${cat}`);
    }
    return lines.join("\n");
  },

  llm: (tokens) => {
    const lines: string[] = [];
    lines.push("## Design Tokens");
    lines.push("");
    for (const t of tokens) {
      const cat = t.category ? ` [${t.category}]` : "";
      lines.push(`- **${t.name}**${cat}`);
    }
    return lines.join("\n");
  },

  json: (tokens) => JSON.stringify(tokens, null, 2),
};

export default formatters;
