import type { Formatters } from "../../shared/formatters.js";

/**
 * Formatter sets for `pragma config channel` output, grouped by branch:
 *
 * - **set** formats the confirmation after setting a channel (plain/llm/json).
 * - **reset** formats the confirmation after resetting to default (plain/llm/json).
 * - **query** formats the current channel value (plain/llm/json).
 */
const channelFormatters = {
  set: {
    plain: (d: { field: string; value: string }) =>
      `Set ${d.field} to "${d.value}".`,
    llm: (d: { field: string; value: string }) =>
      `Set ${d.field} to "${d.value}".`,
    json: (d: { field: string; value: string }) =>
      JSON.stringify({ field: d.field, value: d.value }),
  } satisfies Formatters<{ field: string; value: string }>,

  reset: {
    plain: () => "Reset channel to default.",
    llm: () => "Reset channel to default.",
    json: () => JSON.stringify({ field: "channel", reset: true }),
  } satisfies Formatters<string>,

  query: {
    plain: (channel: string) => `Current channel: ${channel}`,
    llm: (channel: string) => `Current channel: ${channel}`,
    json: (channel: string) =>
      JSON.stringify({ field: "channel", value: channel }),
  } satisfies Formatters<string>,
};

export default channelFormatters;
