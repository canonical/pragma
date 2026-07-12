import type { Formatters } from "../../shared/formatters.js";

/**
 * Formatter sets for `pragma config framework` output, grouped by branch:
 *
 * - **set** formats the confirmation after setting a framework.
 * - **reset** formats the confirmation after resetting to default.
 * - **query** formats the current framework value (or "none").
 */
const frameworkFormatters = {
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
      `Reset framework to default.\nWrote ${d.path}`,
    llm: (d: { field: string; path: string }) =>
      `Reset framework to default.\nWrote ${d.path}`,
    json: (d: { field: string; path: string }) =>
      JSON.stringify({ field: "framework", reset: true, path: d.path }),
  } satisfies Formatters<{ field: string; path: string }>,

  query: {
    plain: (framework: string) => `Current framework: ${framework}`,
    llm: (framework: string) => `Current framework: ${framework}`,
    json: (framework: string) =>
      JSON.stringify({ field: "framework", value: framework }),
  } satisfies Formatters<string>,
};

export default frameworkFormatters;
