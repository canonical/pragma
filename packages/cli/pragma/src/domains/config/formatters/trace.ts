import type { Formatters } from "../../shared/formatters.js";

/**
 * Formatter sets for `pragma config trace` output, grouped by branch:
 *
 * - **set** formats the confirmation after enabling/disabling.
 * - **query** formats the current trace status.
 */
const traceFormatters = {
  set: {
    plain: (d: { field: string; value: boolean }) =>
      d.value ? "Tracing enabled." : "Tracing disabled.",
    llm: (d: { field: string; value: boolean }) =>
      d.value ? "Tracing enabled." : "Tracing disabled.",
    json: (d: { field: string; value: boolean }) =>
      JSON.stringify({ field: d.field, value: d.value }),
  } satisfies Formatters<{ field: string; value: boolean }>,

  query: {
    plain: (status: string) => status,
    llm: (status: string) => status,
    json: (status: string) => JSON.stringify({ field: "trace", value: status }),
  } satisfies Formatters<string>,
};

export default traceFormatters;
