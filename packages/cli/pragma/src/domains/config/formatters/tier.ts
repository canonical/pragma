/**
 * Formatters for `pragma config tier` output.
 *
 * Groups three formatter sets for the tier command's branches:
 * set, reset, and query.
 */

import type { Formatters } from "../../shared/formatters.js";

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
