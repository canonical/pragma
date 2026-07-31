// =============================================================================
// Generic descriptive fields: the predicate selection and the language
// resolution behind `_meta.title`, `_meta.label`, `_meta.comment`, and
// `_meta.definition`.
//
// Every node — embeddable or not — reaches these through `_meta`, so a lens can
// render any provider's data without an inline fragment on a concrete type.
// Each field resolves through a FIXED predicate chain decided once, at compile
// time:
//
//   1. the canonical rdfs/skos predicates, in the order given — the contract's
//      own currency, which must win whenever the instance asserts one;
//   2. then a fallback tier of the class's own String properties, matched by
//      lower-cased OWL LOCAL NAME so that a provider whose instances carry no
//      rdfs:label still renders human text.
//
// Local-name matching keeps this package provider-neutral: no ontology-specific
// predicate IRI appears here, and ds:name / cs:name / any future foo:name all
// resolve identically.
//
// ── DELIBERATE DEVIATION FROM sem ──────────────────────────────────────────
// sem's `resolve_label` is EXACT-TAG-ONLY: `resolve_label(&ls, "fr")` is None
// even when an untagged literal exists (sem-graphql/src/runtime.rs, and its own
// test asserts it). Applying that rule here would null out the entire corpus —
// every literal in this package's fixtures and in the ds:/cs: data is untagged,
// and ke drops empty language tags when it canonicalizes a literal.
//
// So `label`/`comment`/`definition` here resolve: EXACT tag match (case-
// insensitive), ELSE the untagged literals. A *tagged* literal still only ever
// answers its own exact tag — `en` never matches `en-GB`, exactly as in sem.
// The reasoning: an untagged plain literal asserts "no language stated", which
// is not the same claim as "stated in some other language". `title` keeps all
// of sem's tiers stacked on top of that.
// =============================================================================

import {
  getLocalName,
  type OntologyIR,
  type PropertyNode,
  type TripleSet,
} from "../shared/index.js";

/**
 * Is this property a plain String datatype? Only String-valued predicates can
 * back a descriptive field — an Int or an object range would need coercion the
 * generic field deliberately does not perform.
 */
const isStringScalar = (property: PropertyNode | undefined): boolean =>
  property !== undefined &&
  property.range.kind === "scalar" &&
  property.range.graphqlScalar === "String";

/**
 * Select, in resolution order, the predicates that back a descriptive field
 * for one class: the `universal` canonical predicates verbatim and first, then
 * the class's own (and inherited) String properties whose lower-cased OWL local
 * name appears in `localNames`, ordered by that table. Unranked own properties
 * are dropped; duplicates collapse to their earliest position, so the canonical
 * tier always wins. Pure.
 */
export const selectDescriptivePredicates = (
  classUri: string | undefined,
  ir: OntologyIR,
  universal: readonly string[],
  localNames: readonly string[],
): string[] => {
  const node = classUri === undefined ? undefined : ir.classes.get(classUri);
  const ranked: Array<{ uri: string; rank: number }> = [];
  for (const uri of node?.allProperties ?? []) {
    if (!isStringScalar(ir.properties.get(uri))) {
      continue;
    }
    const rank = localNames.indexOf(getLocalName(uri).toLowerCase());
    if (rank !== -1) {
      ranked.push({ uri, rank });
    }
  }
  // Array#sort is stable, so equal ranks preserve declaration order.
  ranked.sort((a, b) => a.rank - b.rank);
  return [...new Set([...universal, ...ranked.map((entry) => entry.uri)])];
};

/**
 * One literal candidate for a descriptive field: its lexical value and its
 * language tag, normalized to "" when the literal is untagged.
 *
 * "" rather than undefined is deliberate. It is the single representation of
 * "no language stated" (ke drops empty tags when it canonicalizes a literal),
 * and it makes the title ordering key a plain concatenation — "" sorts before
 * every real tag, which is exactly sem's `Option::None`-first ordering, with
 * no per-item conditional to get wrong.
 */
export interface Lexical {
  value: string;
  lang: string;
}

/**
 * Collect the literals of the FIRST predicate in the chain that has any. Pure.
 *
 * First-with-any, not first-value: once a predicate speaks, its whole value set
 * is the candidate pool, so `lang` selection happens WITHIN one predicate
 * rather than across two of them. A predicate with only URI or blank-node
 * objects contributes nothing and the walk continues.
 */
export const selectLexicals = (
  triples: TripleSet,
  predicates: readonly string[],
): Lexical[] => {
  for (const predicate of predicates) {
    const lexicals: Lexical[] = [];
    for (const value of triples.get(predicate) ?? []) {
      if (value.kind === "literal") {
        lexicals.push({ value: value.value, lang: value.language ?? "" });
      }
    }
    if (lexicals.length > 0) {
      return lexicals;
    }
  }
  return [];
};

/**
 * Tag comparison: case-insensitive and EXACT. `en` does NOT match `en-GB` —
 * BCP 47 fallback is a policy the caller can add, never one this layer
 * silently applies.
 */
const tagMatches = (tag: string, want: string): boolean =>
  tag !== "" && tag.toLowerCase() === want.toLowerCase();

/**
 * The lexicographically smallest item by `key`, or undefined for an empty
 * list. Lexicographic-least (not first-encountered) because CONSTRUCT result
 * order is not guaranteed: a multi-valued predicate must answer the same value
 * on every request.
 */
const leastBy = <T>(
  items: readonly T[],
  key: (item: T) => string,
): T | undefined => {
  let best: T | undefined;
  let bestKey = "";
  for (const item of items) {
    const candidate = key(item);
    if (best === undefined || candidate < bestKey) {
      best = item;
      bestKey = candidate;
    }
  }
  return best;
};

/** A Lexical's own value, as the ordering key. */
const valueKey = (lexical: Lexical): string => lexical.value;

/**
 * Sort key ordering untagged literals ahead of tagged ones, then by tag, then
 * by value — sem's `(&lang, &value)` tuple ordering, where Rust's
 * `Option::None` sorts before every `Some`. The NUL separator cannot occur in
 * a language tag, so the two components never bleed into each other.
 */
const titleKey = (lexical: Lexical): string =>
  `${lexical.lang}\u0000${lexical.value}`;

/**
 * `label(lang)` — the exact-tag literals if the entity has any, else the
 * untagged ones (the documented deviation from sem, above). Null when neither
 * exists: a caller that needs a total field asks for `title` instead. Pure.
 *
 * An empty-string literal is a value, not a miss, and is returned as-is.
 */
export const resolveLabel = (
  lexicals: readonly Lexical[],
  lang: string,
): string | null => {
  const exact = lexicals.filter((lexical) => tagMatches(lexical.lang, lang));
  const pool =
    exact.length > 0
      ? exact
      : lexicals.filter((lexical) => lexical.lang === "");
  return leastBy(pool, valueKey)?.value ?? null;
};

/**
 * `title(lang)` — TOTAL by construction, so the non-null field is safe:
 * `label(lang)`, else the lexicographically least literal of ANY tag, else the
 * IRI's local name, else the whole IRI when that local name is empty, else the
 * GraphQL type name when the value has no IRI at all (an embedded blank node).
 * Pure.
 */
export const resolveTitle = (
  lexicals: readonly Lexical[],
  lang: string,
  uri: string | null,
  typename: string,
): string => {
  const label = resolveLabel(lexicals, lang);
  if (label !== null) {
    return label;
  }
  const anyTag = leastBy(lexicals, titleKey);
  if (anyTag !== undefined) {
    return anyTag.value;
  }
  if (uri === null) {
    return typename;
  }
  const local = getLocalName(uri);
  return local === "" ? uri : local;
};
