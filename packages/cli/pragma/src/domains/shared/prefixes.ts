/**
 * Prefix maps for ke store creation and display compaction.
 *
 * The core ships only generic RDF vocabularies. Domain prefixes (e.g. the
 * design system's `ds:`/`cs:`) are supplied by the loaded semantic
 * packages and merged over the core at boot via {@link resolvePrefixes}.
 * Renaming a key here updates every derived accessor automatically.
 */

import type { PrefixMap } from "@canonical/ke";

/**
 * Core prefix map — the generic RDF vocabularies pragma itself ships.
 *
 * Registered as PREFIX declarations in every SPARQL query and used as the
 * base of the effective prefix map. Contains no domain-specific prefixes:
 * `ds:`/`cs:` and any other package namespaces arrive from the resolved
 * semantic packages (see {@link resolvePrefixes}).
 */
export const PREFIX_MAP = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
} as const satisfies PrefixMap;

/**
 * Transitional design-system prefixes bundled with the core.
 *
 * @remarks transitional — remove in P4. These belong to the
 * `@canonical/design-system` and `@canonical/code-standards` packages and
 * must move into their own prefix declarations. Until those packages
 * declare `pragma.prefixes`, this bundled fallback keeps existing DS
 * queries resolving and DS IRIs compacting in output. Package-declared
 * prefixes (and config overrides) win over this fallback.
 */
export const TRANSITIONAL_DS_PREFIX_MAP = {
  ds: "https://ds.canonical.com/",
  cs: "http://pragma.canonical.com/codestandards#",
} as const satisfies PrefixMap;

/**
 * The default display/compaction prefix set and the base of the derived
 * accessors — the exact set compacted before P0 split the core from the
 * design system, kept stable during the transition.
 *
 * Deliberately omits `rdf:`/`xsd:` (present in {@link PREFIX_MAP}) so URI
 * compaction in output is unchanged from pre-P0 behavior; the store's
 * query prefix map (see {@link resolvePrefixes}) still carries them.
 *
 * @remarks transitional — the `ds:`/`cs:` members move to their packages
 * in P4, at which point this collapses toward {@link PREFIX_MAP}. Runtime
 * code should prefer the map from {@link resolvePrefixes}, which layers in
 * package-declared and config prefixes over the store base.
 */
export const DEFAULT_PREFIX_MAP = {
  ds: TRANSITIONAL_DS_PREFIX_MAP.ds,
  cs: TRANSITIONAL_DS_PREFIX_MAP.cs,
  rdfs: PREFIX_MAP.rdfs,
  owl: PREFIX_MAP.owl,
  skos: PREFIX_MAP.skos,
} as const satisfies PrefixMap;

/**
 * Resolve the effective prefix map for a boot.
 *
 * Precedence (lowest → highest): the generic {@link PREFIX_MAP}, the
 * transitional DS fallback, prefixes declared by resolved packages (in
 * array order), then config-level overrides. A package that declares its
 * own `ds:`/`cs:` therefore overrides the bundled fallback, and a user's
 * `pragma.config.json` `prefixes` wins over everything.
 *
 * @param packages - Resolved packages, each optionally declaring prefixes.
 * @param configPrefixes - Config-level prefix overrides.
 * @returns The merged prefix map for the store and every query.
 */
export function resolvePrefixes(
  packages: readonly {
    readonly prefixes?: Readonly<Record<string, string>>;
  }[] = [],
  configPrefixes?: Readonly<Record<string, string>>,
): Record<string, string> {
  const packagePrefixes = Object.assign(
    {},
    ...packages.map((pkg) => pkg.prefixes ?? {}),
  );
  return {
    ...PREFIX_MAP,
    ...TRANSITIONAL_DS_PREFIX_MAP,
    ...packagePrefixes,
    ...configPrefixes,
  };
}

/**
 * SPARQL prefix accessors derived from {@link DEFAULT_PREFIX_MAP}.
 *
 * Use in query templates: `${P.ds}Component` → `"ds:Component"`.
 * Renaming a key in the underlying maps automatically updates every query.
 *
 * @remarks The `ds:`/`cs:` accessors are transitional (see
 * {@link TRANSITIONAL_DS_PREFIX_MAP}); they resolve at query time against
 * the store's merged prefix map, which the packages now supply.
 */
export const P = Object.fromEntries(
  Object.keys(DEFAULT_PREFIX_MAP).map((k) => [k, `${k}:`]),
) as { readonly [K in keyof typeof DEFAULT_PREFIX_MAP]: `${K}:` };

/**
 * Turtle `@prefix` declarations derived from {@link DEFAULT_PREFIX_MAP},
 * plus `xsd:` — commonly used by TTL data files but omitted from the
 * display set (SPARQL queries auto-inject the store prefix map).
 */
export const TTL_PREFIXES = [
  ...Object.entries(DEFAULT_PREFIX_MAP).map(
    ([k, uri]) => `@prefix ${k}: <${uri}> .`,
  ),
  `@prefix xsd: <${PREFIX_MAP.xsd}> .`,
].join("\n");
