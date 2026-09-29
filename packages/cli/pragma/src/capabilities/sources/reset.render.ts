/**
 * Formatters for `pragma sources reset` — plain, llm, json.
 *
 * Two outcomes, and the difference matters to a reader: a pointer was removed,
 * or there was none to remove. Neither is an error, so both are rendered as the
 * calm statement they are — and each says what answers reads NOW, because that
 * is the question a reset is asked in service of.
 */

import { BIN_NAME } from "../../constants.js";
import type { Formatters } from "../../kernel/spec/index.js";
import type { SourcesResetData } from "./types.js";

/** What answers this project's reads after the reset, as a sentence. */
function nowAnswering(data: SourcesResetData): string {
  return data.answers === "embedded"
    ? `The snapshot shipped with the CLI answers reads; run \`${BIN_NAME} sources update\` to build from your configured packs again.`
    : `This project declares its own packs, so reads need \`${BIN_NAME} sources update\` before they can answer.`;
}

export const resetFormatters: Formatters<SourcesResetData> = {
  plain(data) {
    if (!data.removed) {
      return `No pack is built for this project — nothing to reset. ${nowAnswering(data)}`;
    }
    return [
      `Removed this project's pack pointer (was ${(data.contentHash ?? "").slice(0, 12)}).`,
      nowAnswering(data),
    ].join("\n");
  },

  llm(data) {
    return [
      `# sources reset`,
      `- Removed: ${data.removed ? (data.contentHash ?? "") : "nothing was built"}`,
      `- Answers: ${data.answers}`,
    ].join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
