/**
 * Formatters for a `config <field>` setter — plain, llm, json (no ink).
 *
 * One shared formatter across all three setters (the field-table pattern). The
 * recap is honest about what happened: a no-op (the value was already set)
 * reports "unchanged" and names no write; a real set reports the transition
 * (`old → new`) and the file it landed in; a reset reports the removed field.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { ConfigFieldResult } from "./types.js";

export const configFieldFormatters: Formatters<ConfigFieldResult> = {
  plain(data) {
    if (!data.changed) {
      return data.reset
        ? `${data.field} is already unset — no change.`
        : `${data.field} is already ${data.value} — no change.`;
    }
    if (data.reset) {
      return `Reset ${data.field} (removed from ${data.path})`;
    }
    const from = data.previous !== undefined ? `${data.previous} → ` : "";
    return `Set ${data.field} = ${from}${data.value} (written to ${data.path})`;
  },

  llm(data) {
    if (!data.changed) {
      return data.reset
        ? `\`${data.field}\` is already unset — no change.`
        : `\`${data.field}\` is already \`${data.value}\` — no change.`;
    }
    if (data.reset) {
      return `Reset \`${data.field}\` — removed from the global config.`;
    }
    const from = data.previous !== undefined ? `\`${data.previous}\` → ` : "";
    return `Set \`${data.field}\` = ${from}\`${data.value}\` in the global config.`;
  },

  json(data) {
    return JSON.stringify(data);
  },
};
