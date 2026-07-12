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
    plain: (d: { field: string; value: string; path: string }) =>
      `Set ${d.field} to "${d.value}".\nWrote ${d.path}`,
    llm: (d: { field: string; value: string; path: string }) =>
      `Set ${d.field} to "${d.value}".\nWrote ${d.path}`,
    json: (d: { field: string; value: string; path: string }) =>
      JSON.stringify({ field: d.field, value: d.value, path: d.path }),
  } satisfies Formatters<{ field: string; value: string; path: string }>,

  reset: {
    plain: (d: { field: string; path: string }) =>
      `Reset channel to default.\nWrote ${d.path}`,
    llm: (d: { field: string; path: string }) =>
      `Reset channel to default.\nWrote ${d.path}`,
    json: (d: { field: string; path: string }) =>
      JSON.stringify({ field: "channel", reset: true, path: d.path }),
  } satisfies Formatters<{ field: string; path: string }>,

  query: {
    plain: (channel: string) => `Current channel: ${channel}`,
    llm: (channel: string) => `Current channel: ${channel}`,
    json: (channel: string) =>
      JSON.stringify({ field: "channel", value: channel }),
  } satisfies Formatters<string>,
};

export default channelFormatters;
