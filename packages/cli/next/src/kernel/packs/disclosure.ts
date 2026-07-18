/**
 * Canonical progressive-disclosure gating for pack lookups.
 *
 * A pack declares an ordered subset of the canonical levels
 * (`constants.DETAIL_LEVELS`: `summary` < `standard` < `detailed`). A field or
 * expand tags itself with the minimum canonical level at which it appears, and
 * gating is by CANONICAL index — so a pack whose levels are `[summary, detailed]`
 * still gates a `detailed`-tagged value at canonical index 2, and a
 * `[summary, standard, detailed]` pack gates by the same scale. This is the
 * single gating rule the SPARQL and GraphQL fetch paths share.
 *
 * The effective level is resolved through PR1's uniform {@link resolveDetail}:
 * `--detail`/injected MCP `detail` (flag) > explicit config `detail` > the pack's
 * `disclosure.default` > the canonical default. The config value counts only when
 * the user actually set it (origin ≠ `default`) so a pack's declared default —
 * block's `detailed`, standard's `summary` — is honoured under default config
 * rather than shadowed by the built-in `detail: "standard"`.
 */

import { DETAIL_LEVELS } from "../../constants.js";
import { resolveDetail } from "../render/disclosure.js";
import type { PragmaRuntime } from "../runtime/types.js";
import type { PackDisclosure, PackExpand, PackField } from "./types.js";

/** The canonical level names, lowest → highest. */
const CANONICAL: readonly string[] = DETAIL_LEVELS;

/** The gating index of a level name (unknown/undefined → base level 0). */
function levelIndex(level: string | undefined): number {
  if (level === undefined) return 0;
  const index = CANONICAL.indexOf(level);
  return index === -1 ? 0 : index;
}

/**
 * Whether an entry tagged `entryLevel` is active at the resolved `activeLevel`.
 *
 * `activeLevel` undefined means "everything" (no disclosure requested — the
 * sample path, and lookups without a declared disclosure).
 */
export function isActiveAtLevel(
  entryLevel: string | undefined,
  activeLevel: string | undefined,
): boolean {
  if (activeLevel === undefined) return true;
  return levelIndex(activeLevel) >= levelIndex(entryLevel);
}

/** The flat values (fields + sections) active at a level, by canonical index. */
export function activeFields(
  lookup: { fields?: readonly PackField[]; sections?: readonly PackField[] },
  activeLevel: string | undefined,
): PackField[] {
  return [...(lookup.fields ?? []), ...(lookup.sections ?? [])].filter(
    (field) => isActiveAtLevel(field.level, activeLevel),
  );
}

/** The expands active at a level, by canonical index (same rule as fields). */
export function activeExpands(
  lookup: { expand?: readonly PackExpand[] },
  activeLevel: string | undefined,
): PackExpand[] {
  return (lookup.expand ?? []).filter((expand) =>
    isActiveAtLevel(expand.level, activeLevel),
  );
}

/**
 * Resolve the effective canonical level for a lookup invocation.
 *
 * @param rt - The runtime (global flags + config loader).
 * @param disclosure - The lookup's declared disclosure, if any.
 * @returns The resolved canonical level, or `undefined` when the lookup declares
 *   no disclosure (everything is fetched).
 * @note Impure — awaits the memoized config load.
 */
export async function resolvePackDetail(
  rt: PragmaRuntime,
  disclosure: PackDisclosure | undefined,
): Promise<string | undefined> {
  if (disclosure === undefined) return undefined;
  const layers = await rt.loadConfig();
  // Only an explicitly-set config detail outranks the pack's declared default;
  // the built-in `detail: "standard"` is the last-resort fallback, not an
  // override, so per-pack defaults survive under default config.
  const configDetail =
    layers.origins.detail !== "default" ? layers.config.detail : undefined;
  return resolveDetail({
    flag: rt.globalFlags.detail,
    config: configDetail,
    specDefault: disclosure.default,
  });
}
