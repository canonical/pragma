/**
 * Store-backed single-entity read: the GRAPH NEIGHBOURHOOD of one URI.
 *
 * The ONE reader shared by the `graph inspect` CLI verb and the MCP resource
 * `read` — so a resource read and a `graph inspect` of the same URI return
 * identical content (the mirror contract). The URI is resolved through the
 * store's merged prefix map and validated safe for `<iri>` embedding — via
 * `resolveUri` → `assertSafeIri`, which rejects every IRI-breaking character
 * (`<>"{}|\^\`` + whitespace) — before it is interpolated, so a prefixed name or
 * absolute IRI addresses the subject exactly and user input never reaches the
 * query text raw.
 *
 * Four things make the payload answerable rather than merely faithful:
 *
 * - **Typed terms.** Read from ke's `termBindings` (the term-preserving view of
 *   the SAME rows), never the stringly `bindings`. This is what makes prefix
 *   compaction SAFE: only a `NamedNode` is compacted, so a literal whose text
 *   happens to start with a namespace IRI is no longer silently rewritten into
 *   something that reads as an IRI. It also keeps `datatype`/`language`, which
 *   the string view drops.
 * - **Inbound relations.** Everything pointing AT the subject, grouped by
 *   predicate. Without it the entity that a resource is supposed to describe
 *   cannot answer "what implements this?" or "what inherits from this?" — the
 *   relations live on the OTHER side of the arrow and were simply invisible.
 * - **Nested blank nodes.** A blank node is a store-local handle: it re-mints on
 *   every load and is unreachable through `pragma:{+uri}`. Inlining one level
 *   turns a dead `_:hash` into the record it stands for (a changelog entry's
 *   text/type/timestamp). Depth ONE is not a shortcut — 11 of this graph's 922
 *   blank nodes nest, so one level is what there is to inline.
 * - **Neighbour titles.** Every named neighbour carries the human name the index
 *   already holds, so a reader is not forced into a second read per IRI just to
 *   learn that `ds:tag.needsdocumentation` is "needs:documentation".
 *
 * Bounded by the SHARED disclosure ladder, and by what an inbound group IS —
 * because not every edge pointing at an entity is the same kind of thing:
 *
 * - A RELATION fans in narrowly and every subject is part of the answer
 *   (`ds:implementsBlock`, `ds:inheritsFrom`), so it is LISTED.
 * - A ROSTER fans in without bound because it grows with the data rather than
 *   the model — a class extension (`rdf:type`), a tier's membership (`ds:tier`,
 *   141 deep here) — and is already answered by `pragma/instanceCount` and by
 *   the noun's list verb. So it is SAMPLED: a few exemplars, flagged `sampled`,
 *   never a page. Listing rosters cost a `detailed` read 19.5 KB on one class
 *   and 20.9 KB on one tier, restating what a single `*_list` answers properly.
 *
 * The two are told apart by FAN-IN, not by predicate name, so the kernel names
 * no vocabulary and a graph whose rosters hang off different predicates is
 * bounded just the same. `count` always reports the TRUE total either way: a
 * sample that silently passed for the whole set is how "3 implementations"
 * becomes a wrong answer.
 *
 * Reached only behind the lazy store (a `needsStore` verb / a resource read), so
 * it never lands on the storeless fast path.
 */

import type { DetailLevel } from "../../constants.js";
import { PragmaError } from "../error/PragmaError.js";
import { cliRecovery } from "../error/recovery.js";
import { resolveUri } from "../packs/iri.js";
import { compactUri } from "../render/compactUri.js";
import { resolveDetail } from "../render/disclosure.js";
import type { PackIndex } from "./graphpack/types.js";
import type { PragmaRuntime } from "./types.js";

// Inline `import("…")` type (no `from`) — a static `import type` from
// @canonical/ke still puts the package on the module graph the lazy-dispatch
// probe walks (`capabilities/lazy.test.ts`), which would drag the store runtime
// onto the storeless `--help`/`__complete` fast path. Same device, and same
// reason, as `graph/query.render.ts`.
type Term = import("@canonical/ke").Term;

/**
 * Where a relation stops being an answer and becomes a roster.
 *
 * A group at or under this fan-in is LISTED: every subject is part of the
 * answer, and there are few enough that reading them is cheaper than going to
 * fetch them. Above it, listing the head is not more useful than showing a few
 * — only longer — so the group is SAMPLED instead.
 *
 * Derived from fan-in rather than from a predicate name, which is what keeps the
 * kernel free of vocabulary: `rdf:type` inbound is the obvious roster (a class
 * extension, unbounded by construction and already answered by
 * `pragma/instanceCount` and the noun's list verb), but it is NOT the only one.
 * Membership edges behave identically — this graph's `ds:tier` fans in 141 deep
 * — and a rule keyed on `rdf:type` would have left a `detailed` read of one tier
 * at 20.9 KB while congratulating itself on having fixed classes.
 */
const ROSTER_THRESHOLD = 20;

/** How many subjects each level lists for a genuine ANSWER (fan-in ≤ threshold). */
const ANSWER_CAP: Readonly<Record<DetailLevel, number>> = {
  summary: 0,
  standard: 10,
  detailed: ROSTER_THRESHOLD,
};

/**
 * How many EXEMPLARS each level shows for a roster — the move the `*_sample`
 * verbs make, and for the same reason: enough to see the shape of a member,
 * never the roster itself. `count` stays exact and {@link InboundGroup.sampled}
 * says which kind of answer this is, so a reader reaches for the list verb
 * rather than trying to page a resource read into one.
 */
const SAMPLE_CAP: Readonly<Record<DetailLevel, number>> = {
  summary: 0,
  standard: 3,
  detailed: 5,
};

/**
 * How many characters of a LITERAL each level carries.
 *
 * The measured cost of a rich entity is not its structure but its prose: one
 * button spent 8,572 of its 9,734 literal characters on two fields
 * (`ds:guidelines` 5,814, `ds:usage` 2,758). Serving those in full at the
 * DEFAULT level makes every read of that entity pay for documentation the
 * reader may not have asked for — and the noun's own lookup verb serves the
 * same fields under its own disclosure, properly.
 *
 * So long-form prose is what `detailed` is FOR. Below it a literal is previewed
 * and marked {@link ReadTerm.truncated} with its true {@link ReadTerm.length},
 * so a reader can always see that there is more and how much.
 */
const LITERAL_CAP: Readonly<Record<DetailLevel, number>> = {
  summary: 120,
  standard: 400,
  detailed: Number.POSITIVE_INFINITY,
};

/**
 * Ceiling on the inbound rows fetched in one query. Above every hub this graph
 * has (335), so `count` is exact in practice; a graph that exceeds it degrades
 * to an undercount on that one predicate rather than an unbounded read.
 */
const INBOUND_FETCH_LIMIT = 500;

/** The predicate whose object is a subject's type — hoisted out of nested records. */
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

/** An RDF term as the read projects it: typed, compacted, and named. */
export interface ReadTerm {
  readonly termType: "NamedNode" | "BlankNode" | "Literal";
  /** The full lexical value (the IRI, the literal text, or the blank label). */
  readonly value: string;
  /** Prefixed form — `NamedNode` only, and only when a namespace matches. */
  readonly prefixed?: string;
  /** Human name from the pack index — `NamedNode` only, when the index knows it. */
  readonly title?: string;
  /** Literal datatype, compacted; absent for plain `xsd:string` (ke's convention). */
  readonly datatype?: string;
  /** Literal language tag, when the literal carries one. */
  readonly language?: string;
  /** Set when `value` is a PREFIX of the real literal (see {@link length}). */
  readonly truncated?: true;
  /** The literal's true character count, present only when truncated. */
  readonly length?: number;
  /**
   * Marks a term no `pragma:{+uri}` read can resolve. Only blank nodes carry it:
   * their labels are store-local and re-mint on every load, so following one is
   * always a dead end — stated here rather than left for the reader to discover.
   */
  readonly addressable?: false;
}

/** One inlined blank node: its fields, keyed by predicate, as terms. */
export type NestedRecord = Record<string, ReadTerm>;

/** All objects asserted for one predicate on the subject. */
export interface PredicateGroup {
  readonly predicate: ReadTerm;
  readonly objects: ReadTerm[];
}

/** Everything asserting one predicate ABOUT the subject. */
export interface InboundGroup {
  readonly predicate: ReadTerm;
  /** The TRUE number of subjects, whatever `subjects` was capped to. */
  readonly count: number;
  /** Subjects — listed for a relation, sampled for a roster; level-capped. */
  readonly subjects: ReadTerm[];
  /** Set when `subjects` is shorter than `count`. */
  readonly truncated?: true;
  /**
   * Set when the group is a ROSTER rather than a relation: `subjects` are
   * EXEMPLARS chosen to show the shape of a member, not the head of a page.
   * Reach for the noun's list verb for the full set — paging a resource read
   * will not produce one.
   */
  readonly sampled?: true;
}

/** The result of inspecting one subject URI. */
export interface InspectResult {
  /** The resolved (full) subject URI. */
  readonly uri: string;
  /** The subject's prefixed form, when a namespace matches. */
  readonly prefixed?: string;
  /** Human label from the pack index, when known. */
  readonly label?: string | null;
  /** Predicate/object groups asserted BY the subject, ordered by predicate. */
  readonly groups: PredicateGroup[];
  /** Predicate groups asserted ABOUT the subject, ordered by predicate. */
  readonly inbound: InboundGroup[];
  /**
   * Blank-node objects inlined one level, keyed by the predicate that reaches
   * them. Omitted at `summary`.
   *
   * Field values are TERMS, not strings: a record's members are as much a part
   * of the graph as the subject's own, and flattening them would reintroduce
   * exactly the IRI-versus-literal ambiguity the term projection exists to
   * close — and leave the Turtle serializer unable to tell `ds:Foo` from
   * `"ds:Foo"`.
   */
  readonly nested: Record<string, NestedRecord[]>;
  /** The disclosure level this payload was built at. */
  readonly detail: DetailLevel;
}

/**
 * Whether a name tells a reader anything the URI's own local name did not.
 *
 * Measured on this graph, EVERY title a button's neighbourhood carried merely
 * restated its local name in different casing (`ds:implementsBlock` titled
 * "implementsBlock", `ds:apps.component.file_tree` titled "FileTree"). Emitting
 * those spends a reader's attention — and an agent's context — to say the same
 * word twice. A graph whose labels are real prose (a concept at `ds:concept.pd`
 * named "Progressive disclosure") still keeps them, so this thins noise without
 * deciding that labels are worthless.
 */
function isInformativeName(name: string, short: string): boolean {
  const normalize = (value: string): string =>
    value.replace(/[\s._:-]/g, "").toLowerCase();
  const local = short.split(/[:.]/).pop() ?? short;
  return normalize(name) !== normalize(local);
}

/** Index lookup for a neighbour's human name (`label`, else the first alt name). */
function nameIndex(index: PackIndex): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  for (const entity of index.entities) {
    if (!entity.uri) continue;
    const name = entity.label ?? entity.altNames?.[0];
    if (name && !names.has(entity.uri)) names.set(entity.uri, name);
  }
  return names;
}

/** Project one ke term into a {@link ReadTerm}, previewing long literals. */
function toReadTerm(
  term: Term,
  prefixes: Readonly<Record<string, string>>,
  names: ReadonlyMap<string, string>,
  detail: DetailLevel,
): ReadTerm {
  if (term.termType === "NamedNode") {
    const prefixed = compactUri(term.value, prefixes);
    const name = names.get(term.value);
    const title = name && isInformativeName(name, prefixed) ? name : undefined;
    return {
      termType: "NamedNode",
      value: term.value,
      // compactUri returns the input unchanged when no namespace matches, so an
      // unmatched IRI carries no `prefixed` rather than one echoing `value`.
      ...(prefixed === term.value ? {} : { prefixed }),
      ...(title ? { title } : {}),
    };
  }
  if (term.termType === "BlankNode") {
    return { termType: "BlankNode", value: term.value, addressable: false };
  }
  const cap = LITERAL_CAP[detail];
  const overlong = term.value.length > cap;
  return {
    termType: "Literal",
    value: overlong ? term.value.slice(0, cap) : term.value,
    ...(overlong
      ? { truncated: true as const, length: term.value.length }
      : {}),
    ...(term.datatype ? { datatype: compactUri(term.datatype, prefixes) } : {}),
    ...(term.language ? { language: term.language } : {}),
  };
}

/**
 * Read one entity's graph neighbourhood.
 *
 * @param rt - The runtime (lazy store, query facade, config, global flags).
 * @param uri - A prefixed name or absolute IRI.
 * @returns The resolved subject, its outbound groups, inbound groups, inlined
 *   blank nodes, and the detail level the payload was built at.
 * @throws PragmaError ENTITY_NOT_FOUND when the subject asserts no triples.
 * @note Impure — boots the store and queries it (three reads: out, in, nested).
 */
export async function readEntity(
  rt: Pick<PragmaRuntime, "store" | "query" | "loadConfig" | "globalFlags">,
  uri: string,
): Promise<InspectResult> {
  const session = await rt.store.get();
  const resolved = resolveUri(uri, session.prefixes);

  const outbound = await rt.query.sparql(
    `SELECT ?predicate ?object WHERE { <${resolved}> ?predicate ?object } ORDER BY ?predicate ?object`,
  );

  if (outbound.type !== "select" || outbound.termBindings.length === 0) {
    throw PragmaError.notFound("entity", uri, {
      recovery: cliRecovery(
        `graph query 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10'`,
        "Check the URI, or list known entities.",
        { tool: "graph_query" },
      ),
    });
  }

  // The level is resolved from the SAME sources as every other disclosure: the
  // `--detail` flag (which the MCP `detail` param also seeds), then config. A
  // resource read carries no params of its own, so it lands on the config value
  // — `config_set detail detailed` is how an agent asks a resource for more.
  const detail = resolveDetail({
    flag: rt.globalFlags.detail,
    config: (await rt.loadConfig()).config.detail,
  });
  const names = nameIndex(session.index);
  const term = (value: Term): ReadTerm =>
    toReadTerm(value, session.prefixes, names, detail);

  const groupMap = new Map<string, ReadTerm[]>();
  const predicates = new Map<string, ReadTerm>();
  let hasBlankObject = false;
  for (const binding of outbound.termBindings) {
    const predicate = binding.predicate;
    const object = binding.object;
    if (!predicate || !object) continue;
    if (object.termType === "BlankNode") hasBlankObject = true;
    predicates.set(predicate.value, term(predicate));
    const objects = groupMap.get(predicate.value) ?? [];
    objects.push(term(object));
    groupMap.set(predicate.value, objects);
  }
  const groups: PredicateGroup[] = [...groupMap.entries()].map(
    ([predicate, objects]) => ({
      // Every key was written from a binding above, so the lookup cannot miss.
      predicate: predicates.get(predicate) as ReadTerm,
      objects,
    }),
  );

  const inbound = await readInbound(rt, resolved, detail, term);
  const nested =
    detail === "summary" || !hasBlankObject
      ? {}
      : await readNested(rt, resolved, session.prefixes, term);

  const prefixed = compactUri(resolved, session.prefixes);
  const label = session.index.entities.find((e) => e.uri === resolved)?.label;
  return {
    uri: resolved,
    ...(prefixed === resolved ? {} : { prefixed }),
    ...(label != null ? { label } : {}),
    groups,
    inbound,
    nested,
    detail,
  };
}

/**
 * Everything asserting a predicate about the subject, grouped and capped.
 *
 * One query rather than one per predicate: the rows are grouped in memory, so a
 * hub costs the same round trip as a leaf.
 */
async function readInbound(
  rt: Pick<PragmaRuntime, "query">,
  resolved: string,
  detail: DetailLevel,
  term: (value: Term) => ReadTerm,
): Promise<InboundGroup[]> {
  const result = await rt.query.sparql(
    `SELECT ?predicate ?subject WHERE { ?subject ?predicate <${resolved}> } ORDER BY ?predicate ?subject LIMIT ${INBOUND_FETCH_LIMIT}`,
  );
  if (result.type !== "select") return [];

  const counts = new Map<string, number>();
  const retained = new Map<string, Term[]>();
  const predicates = new Map<string, Term>();
  for (const binding of result.termBindings) {
    const predicate = binding.predicate;
    const subject = binding.subject;
    if (!predicate || !subject) continue;
    const key = predicate.value;
    predicates.set(key, predicate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    // Count every row but retain only what the widest rule could ever show, so
    // a 335-deep hub is counted without 335 terms being built. A roster shows
    // at most SAMPLE_CAP and a relation at most ROSTER_THRESHOLD, so the
    // threshold bounds both — and retaining one MORE than it is what lets the
    // fan-in test below distinguish "exactly at the threshold" from "over it".
    const rows = retained.get(key) ?? [];
    if (rows.length <= ROSTER_THRESHOLD) rows.push(subject);
    retained.set(key, rows);
  }

  return [...counts.entries()].map(([key, count]) => {
    // What the group IS decides how it is shown: a relation is listed, a roster
    // is sampled. Derived from fan-in, so no predicate is named here.
    const roster = count > ROSTER_THRESHOLD;
    const cap = roster ? SAMPLE_CAP[detail] : ANSWER_CAP[detail];
    const subjects = (retained.get(key) ?? []).slice(0, cap).map(term);
    return {
      predicate: term(predicates.get(key) as Term),
      count,
      subjects,
      ...(subjects.length < count ? { truncated: true as const } : {}),
      ...(roster ? { sampled: true as const } : {}),
    };
  });
}

/**
 * Blank-node objects inlined one level, as one record per node.
 *
 * Records rather than triples: the same content is roughly half the bytes and
 * reads as the thing it models (a changelog entry, a property) instead of a
 * scatter of rows the reader has to reassemble. `rdf:type` is hoisted to `type`
 * — it is the record's kind, not one of its fields, and repeating it inline put
 * the same IRI on every row.
 */
async function readNested(
  rt: Pick<PragmaRuntime, "query">,
  resolved: string,
  prefixes: Readonly<Record<string, string>>,
  term: (value: Term) => ReadTerm,
): Promise<Record<string, NestedRecord[]>> {
  const result = await rt.query.sparql(
    `SELECT ?predicate ?node ?nodePredicate ?nodeObject WHERE { <${resolved}> ?predicate ?node . FILTER(isBlank(?node)) . ?node ?nodePredicate ?nodeObject } ORDER BY ?predicate ?node ?nodePredicate`,
  );
  if (result.type !== "select") return {};

  // Keyed by blank-node label so repeated nodes under one predicate stay
  // separate records; the label itself never reaches the payload.
  const records = new Map<string, { via: string; row: NestedRecord }>();
  for (const binding of result.termBindings) {
    const predicate = binding.predicate;
    const node = binding.node;
    const nodePredicate = binding.nodePredicate;
    const nodeObject = binding.nodeObject;
    if (!predicate || !node || !nodePredicate || !nodeObject) continue;
    const via = compactUri(predicate.value, prefixes);
    const record = records.get(node.value) ?? { via, row: {} };
    const field =
      nodePredicate.value === RDF_TYPE
        ? "type"
        : compactUri(nodePredicate.value, prefixes);
    record.row[field] = term(nodeObject);
    records.set(node.value, record);
  }

  const nested: Record<string, NestedRecord[]> = {};
  for (const { via, row } of records.values()) {
    const rows = nested[via] ?? [];
    rows.push(row);
    nested[via] = rows;
  }
  // Order records by their CONTENT, never by the blank-node label that grouped
  // them. Oxigraph re-mints those labels on every load, so ordering by them made
  // two reads of the same unchanged entity return the same records in different
  // orders — nondeterminism the mirror test caught and a caller diffing two
  // reads would have seen as spurious change.
  for (const rows of Object.values(nested)) {
    rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return nested;
}
