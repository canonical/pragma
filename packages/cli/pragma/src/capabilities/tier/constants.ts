/**
 * The `tier` noun's own vocabulary constant.
 *
 * The class every tier entity carries — pack CONTENT, authored once here. The
 * bespoke `tier lookup` and its completion ref both read it, so the noun cannot
 * disagree with itself about what a tier is. It is NOT promoted to the
 * distribution declaration: no kernel module needs it, and a fork replacing this
 * noun replaces this module wholesale.
 *
 * The matching `tier list` story lives in `pragma.conf.ts` and spells the same
 * class literally, because the distribution config is inert data and may import
 * nothing. `distribution.parity.test.ts` holds the two to the same value.
 */

export const TIER_TYPE = "ds:Tier";
