/**
 * Formatters for `token add-config` — plain, llm, json.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { AddConfigResult } from "./runAddConfig.js";

export const addConfigFormatters: Formatters<AddConfigResult> = {
  plain(data) {
    const lines = [
      `${data.alreadyExisted ? "Updated" : "Wrote"} ${data.path}`,
      `  ${data.tokenCount} token${data.tokenCount === 1 ? "" : "s"} in the active graph`,
      `  sources: ${data.sources.join(", ")}`,
    ];
    return lines.join("\n");
  },
  llm(data) {
    return [
      `${data.alreadyExisted ? "Updated" : "Wrote"} \`${data.path}\` for the terrazzo token pipeline.`,
      `- ${data.tokenCount} token(s) in the active graph`,
      `- sources: ${data.sources.map((source) => `\`${source}\``).join(", ")}`,
    ].join("\n");
  },
  json(data) {
    return JSON.stringify(data);
  },
};
