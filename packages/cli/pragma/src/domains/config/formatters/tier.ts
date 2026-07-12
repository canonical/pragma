import type { Formatters } from "../../shared/formatters.js";

/** Payload for a persisted config write, including the file written. */
interface TierWrite {
  readonly field: string;
  readonly value: string;
  readonly path: string;
}

/**
 * Formatter sets for `pragma config tier` output, grouped by branch:
 *
 * - **set** formats the confirmation after setting a tier (plain/llm/json).
 * - **reset** formats the confirmation after resetting to default (plain/llm/json).
 * - **query** formats the current tier value (plain/llm/json).
 */
const tierFormatters = {
  set: {
    plain: (d: TierWrite) => `Set ${d.field} to "${d.value}".\nWrote ${d.path}`,
    llm: (d: TierWrite) => `Set ${d.field} to "${d.value}".\nWrote ${d.path}`,
    json: (d: TierWrite) =>
      JSON.stringify({ field: d.field, value: d.value, path: d.path }),
  } satisfies Formatters<TierWrite>,

  reset: {
    plain: (d: { field: string; path: string }) =>
      `Reset tier to default.\nWrote ${d.path}`,
    llm: (d: { field: string; path: string }) =>
      `Reset tier to default.\nWrote ${d.path}`,
    json: (d: { field: string; path: string }) =>
      JSON.stringify({ field: "tier", reset: true, path: d.path }),
  } satisfies Formatters<{ field: string; path: string }>,

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
