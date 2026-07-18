import type { Formatters } from "../../shared/formatters.js";

/**
 * Formatter sets for `pragma config detail` output, grouped by branch:
 *
 * - **set** formats the confirmation after setting a level (plain/llm/json).
 * - **reset** formats the confirmation after resetting to default (plain/llm/json).
 * - **query** formats the current level value (plain/llm/json).
 */
const detailFormatters = {
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
      `Reset detail to default.\nWrote ${d.path}`,
    llm: (d: { field: string; path: string }) =>
      `Reset detail to default.\nWrote ${d.path}`,
    json: (d: { field: string; path: string }) =>
      JSON.stringify({ field: "detail", reset: true, path: d.path }),
  } satisfies Formatters<{ field: string; path: string }>,

  query: {
    plain: (detail: string | undefined) =>
      detail !== undefined
        ? `Current detail: ${detail}`
        : "No detail default set (each surface uses its own default).",
    llm: (detail: string | undefined) =>
      detail !== undefined
        ? `Current detail: ${detail}`
        : "No detail default set (each surface uses its own default).",
    json: (detail: string | undefined) =>
      JSON.stringify({ field: "detail", value: detail ?? null }),
  } satisfies Formatters<string | undefined>,
};

export default detailFormatters;
