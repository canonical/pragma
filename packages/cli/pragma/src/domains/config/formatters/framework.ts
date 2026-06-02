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
    plain: (d: { field: string; value: string }) =>
      `Set ${d.field} to "${d.value}".`,
    llm: (d: { field: string; value: string }) =>
      `Set ${d.field} to "${d.value}".`,
    json: (d: { field: string; value: string }) =>
      JSON.stringify({ field: d.field, value: d.value }),
  } satisfies Formatters<{ field: string; value: string }>,

  reset: {
    plain: () => "Reset framework to default.",
    llm: () => "Reset framework to default.",
    json: () => JSON.stringify({ field: "framework", reset: true }),
  } satisfies Formatters<string>,

  query: {
    plain: (framework: string) => `Current framework: ${framework}`,
    llm: (framework: string) => `Current framework: ${framework}`,
    json: (framework: string) =>
      JSON.stringify({ field: "framework", value: framework }),
  } satisfies Formatters<string>,
};

export default frameworkFormatters;
