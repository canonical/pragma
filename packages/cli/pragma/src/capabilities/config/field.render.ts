/**
 * Formatters for the config writers (`set` and `unset`) — plain, llm, json.
 *
 * One shared formatter (the field-table pattern): a set reports the value and
 * the file it landed in; an unset reports the removed field.
 */

import type { Formatters } from "../../kernel/spec/index.js";
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
