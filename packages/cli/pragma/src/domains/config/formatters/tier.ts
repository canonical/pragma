import type { Formatters } from "../../shared/formatters.js";

/**
 * Formatter sets for `pragma config tier` output, grouped by branch:
 *
 * - **set** formats the confirmation after setting a tier (plain/llm/json).
 * - **reset** formats the confirmation after resetting to default (plain/llm/json).
 * - **query** formats the current tier value (plain/llm/json).
 */
const tierFormatters = {
  set: {
    plain: (d: { field: string; value: string }) =>
      `Set ${d.field} to "${d.value}".`,
    llm: (d: { field: string; value: string }) =>
      `Set ${d.field} to "${d.value}".`,
    json: (d: { field: string; value: string }) =>
      JSON.stringify({ field: d.field, value: d.value }),
  } satisfies Formatters<{ field: string; value: string }>,

  reset: {
    plain: () => "Reset tier to default.",
    llm: () => "Reset tier to default.",
    json: () => JSON.stringify({ field: "tier", reset: true }),
  } satisfies Formatters<string>,

  query: {
    plain: (tier: string | undefined) =>
      tier !== undefined
        ? `Current tier: ${tier}`
        : "No tier set (all tiers visible).",
    llm: (tier: string | undefined) =>
      tier !== undefined
        ? `Current tier: ${tier}`
        : "No tier set (all tiers visible).",
    json: (tier: string | undefined) =>
      JSON.stringify({ field: "tier", value: tier ?? null }),
  } satisfies Formatters<string | undefined>,
};

export default tierFormatters;
