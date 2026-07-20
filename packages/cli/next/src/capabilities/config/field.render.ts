/**
 * Formatters for a `config <field>` setter — plain, llm, json (no ink).
 *
 * One shared formatter across all three setters (the field-table pattern): a
 * set reports the value and the file it landed in; a reset reports the removed
 * field.
 */

import type { Formatters } from "../../kernel/spec/types.js";
import type { ConfigFieldResult } from "./types.js";

export const configFieldFormatters: Formatters<ConfigFieldResult> = {
  plain(data) {
    return data.reset
      ? `Reset ${data.field} (removed from ${data.path})`
      : `Set ${data.field} = ${data.value} (written to ${data.path})`;
  },

  llm(data) {
    return data.reset
      ? `Reset \`${data.field}\` — removed from the global config.`
      : `Set \`${data.field}\` = \`${data.value}\` in the global config.`;
  },

  json(data) {
    return JSON.stringify(data);
  },
};
