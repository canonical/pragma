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
 * Core prefixes reserved for pragma's own vocabularies. Packages and config
 * may not redefine these — every query and the RDF/OWL/SKOS toolchain depend
 * on them resolving to the canonical W3C namespaces, so a package that shadows
 * `rdf:` (accidentally or maliciously) would silently corrupt every query.
 */
const RESERVED_PREFIXES: ReadonlySet<string> = new Set(Object.keys(PREFIX_MAP));

/** A syntactically safe SPARQL prefix name (PN_PREFIX subset we accept). */
const SAFE_PREFIX_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Reject a namespace that cannot appear inside a SPARQL `<IRIREF>` unescaped.
 * ke injects prefixes verbatim as `PREFIX name: <iri>`; a namespace containing
 * `>` (or whitespace/control/`<"{}|^`\``) would break out of the IRI and inject
 * arbitrary SPARQL into every query. SPARQL's IRIREF grammar forbids exactly
 * these, so anything matching is both unsafe and invalid Turtle/SPARQL.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: IRIREF forbids U+0000–U+0020 by grammar
const UNSAFE_NAMESPACE = /[\x00-\x20<>"{}|^`\\]/;

/**
 * Validate and merge one source of declared prefixes onto an accumulator.
 *
 * Skips (with a stderr warning) any entry that is unsafe to inject: a
 * malformed prefix name, a namespace that could break out of the SPARQL
 * IRIREF, or an attempt to redefine a reserved core prefix. Also warns when a
 * later source silently overrides an already-declared prefix (last-wins
 * collision), so a name clash between two packages is visible rather than
 * mysterious.
 *
 * @note Impure — writes warnings to stderr.
 */
function mergePrefixSource(
  acc: Record<string, string>,
  claimed: Set<string>,
  source: Readonly<Record<string, string>> | undefined,
  origin: string,
): void {
  if (!source) return;
  for (const [name, namespace] of Object.entries(source)) {
    if (!SAFE_PREFIX_NAME.test(name)) {
      process.stderr.write(
        `Warning: ignoring prefix "${name}" from ${origin} — not a valid prefix name.\n`,
      );
      continue;
    }
    if (RESERVED_PREFIXES.has(name)) {
      process.stderr.write(
        `Warning: ignoring prefix "${name}" from ${origin} — "${name}:" is reserved for a core RDF vocabulary and cannot be redefined.\n`,
      );
      continue;
    }
    if (UNSAFE_NAMESPACE.test(namespace)) {
      process.stderr.write(
        `Warning: ignoring prefix "${name}" from ${origin} — namespace contains characters that are not valid in an IRI.\n`,
      );
      continue;
    }
    // Warn only on a collision between two *validated* sources (package vs.
    // package/config). Silently overriding the trusted DS fallback is the
    // expected transitional handoff, not a clash.
    if (claimed.has(name) && acc[name] !== namespace) {
      process.stderr.write(
        `Warning: prefix "${name}" from ${origin} overrides an earlier declaration (was <${acc[name]}>, now <${namespace}>).\n`,
      );
    }
    acc[name] = namespace;
    claimed.add(name);
  }
}

/**
 * Resolve the effective prefix map for a boot.
 *
 * Precedence (lowest → highest): the generic {@link PREFIX_MAP}, the
 * transitional DS fallback, prefixes declared by resolved packages (in
 * array order), then config-level overrides. A package that declares its
 * own `ds:`/`cs:` therefore overrides the bundled fallback, and a user's
 * `pragma.config.json` `prefixes` wins over everything.
 *
 * Package- and config-declared prefixes are validated before they reach the
 * store: unsafe names/namespaces are skipped (they would otherwise be injected
 * verbatim into every SPARQL query), reserved core prefixes cannot be
 * redefined, and last-wins collisions are surfaced as warnings. The bundled
 * core and DS fallback are trusted and merged as-is.
 *
 * @param packages - Resolved packages, each optionally declaring prefixes.
 * @param configPrefixes - Config-level prefix overrides.
 * @returns The merged prefix map for the store and every query.
 */
export function resolvePrefixes(
  packages: readonly {
    readonly name?: string;
    readonly prefixes?: Readonly<Record<string, string>>;
  }[] = [],
  configPrefixes?: Readonly<Record<string, string>>,
): Record<string, string> {
  const merged: Record<string, string> = {
    ...PREFIX_MAP,
    ...TRANSITIONAL_DS_PREFIX_MAP,
  };
  // Keys claimed by a validated source, so collisions between two such
  // sources warn while overriding the trusted seed stays silent.
  const claimed = new Set<string>();
  for (const pkg of packages) {
    // Name the declaring package in the origin so collision/injection
    // warnings point at the actual source, not a generic placeholder.
    const origin = pkg.name ? `package "${pkg.name}"` : "a semantic package";
    mergePrefixSource(merged, claimed, pkg.prefixes, origin);
  }
  mergePrefixSource(merged, claimed, configPrefixes, "pragma.config.json");
  return merged;
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
