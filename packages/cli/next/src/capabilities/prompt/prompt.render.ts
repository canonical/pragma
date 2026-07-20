/**
 * Formatters for the `prompt` content noun — plain, llm, json.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type {
  PromptArgument,
  PromptListData,
  PromptLookupData,
} from "./types.js";

/** Render an argument list as `name (required)` / `name` tokens. */
function argTokens(args: readonly PromptArgument[]): string {
  if (args.length === 0) return "(none)";
  return args
    .map((arg) => (arg.required ? `${arg.name} (required)` : arg.name))
    .join(", ");
}

export const promptListFormatters: Formatters<PromptListData> = {
  plain(data) {
    if (data.prompts.length === 0) return "No prompts in the store.";
    const lines = ["Prompts"];
    for (const prompt of data.prompts) {
      lines.push(`  ${prompt.name} — ${prompt.description ?? ""}`.trimEnd());
      lines.push(`    args: ${argTokens(prompt.arguments)}`);
    }
    return lines.join("\n");
  },
  llm(data) {
    if (data.prompts.length === 0) return "_No prompts in the store._";
    // H2 for a content read — consistent with the shared list renderer (B2).
    const lines = ["## Prompts"];
    for (const prompt of data.prompts) {
      lines.push(
        `- \`${prompt.name}\` — ${prompt.description ?? ""}`.trimEnd(),
      );
      lines.push(`  - args: ${argTokens(prompt.arguments)}`);
    }
    return lines.join("\n");
  },
  json(data) {
    return JSON.stringify(data);
  },
};

export const promptLookupFormatters: Formatters<PromptLookupData> = {
  plain(data) {
    // Match the shared `renderLookupPlain` frame (title, ═ rule, blank) (B7).
    const rule = "═".repeat(Math.max(data.name.length, 24));
    const lines = [data.name, rule, ""];
    if (data.description) lines.push(`  ${data.description}`);
    lines.push(`  args: ${argTokens(data.arguments)}`, "", data.body);
    return lines.join("\n");
  },
  llm(data) {
    // H2 entity title with H3 sub-sections — the hierarchy the shared
    // `renderLookupLlm` uses (`## title` / `### section`) (B2).
    const lines = [`## ${data.name}`];
    if (data.description) lines.push(data.description);
    if (data.arguments.length > 0) {
      lines.push("", "### Arguments");
      for (const arg of data.arguments) {
        lines.push(
          `- \`${arg.name}\`${arg.required ? " (required)" : ""}${arg.description ? ` — ${arg.description}` : ""}`,
        );
      }
    }
    lines.push("", "### Template", data.body);
    return lines.join("\n");
  },
  json(data) {
    return JSON.stringify(data);
  },
};
