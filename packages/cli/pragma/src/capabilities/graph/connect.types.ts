/**
 * The shape of a `graph connect` answer — the ONE contract its run body writes
 * and its three formatters read.
 *
 * Type-only, and deliberately its own module: the formatters hang off the verb
 * spec, so they are on the static import graph the lazy-dispatch probe walks
 * (`capabilities/lazy.test.ts`), while the walk itself must stay behind a
 * dynamic import. A shared type module lets both sides name the same answer
 * without dragging the traversal onto the storeless fast path.
 *
 * Every answer carries the POLICY it was produced under — the hop limit, the
 * roster threshold, and the packs searched. That is Constitution VI applied to
 * the answer rather than only to the source: the commonest answer this verb
 * gives is "these two are not connected", and that sentence means nothing
 * without knowing how far it looked, what it was willing to walk, and what it
 * was looking in. A missing pack is what makes an honest "no path" and a
 * dishonest one byte-identical, so `packs` is present whether the answer is
 * positive or negative.
 */

/** A node or predicate as the answer names it: full IRI, short form, human name. */
export interface ConnectTerm {
  /** The full IRI, or a blank node's session-local label. */
  readonly value: string;
  /** Prefixed form, when a loaded namespace matches. */
  readonly prefixed?: string;
  /** Human name from the pack index, when it says more than the local name. */
  readonly title?: string;
  /**
   * Marks a term no `pragma:{+uri}` read can resolve. Only blank nodes carry
   * it: their labels re-mint on every load, so the record is real but its
   * handle is not addressable. Blank nodes ARE walked — 6,942 of them carry the
   * token graph's declarations and resolved values — so a path may name one.
   */
  readonly addressable?: false;
}

/**
 * One step of a path: the triple that was traversed, and which way.
 *
 * `direction` is not decoration. `forward` says the triple `(from, predicate,
 * to)` is asserted; `reverse` says `(to, predicate, from)` is. Concatenating a
 * path's steps walks from one endpoint to the other only if each step's
 * direction is respected, and an answer that dropped it would claim edges the
 * graph does not assert.
 */
export interface ConnectStep {
  readonly from: ConnectTerm;
  readonly predicate: ConnectTerm;
  readonly direction: "forward" | "reverse";
  readonly to: ConnectTerm;
}

/** One path: an ordered walk of steps from `a` to `b`. */
export interface ConnectPath {
  readonly steps: readonly ConnectStep[];
}

/**
 * A group both endpoints belong to that is a ROSTER rather than a relation —
 * membership, which is what the noun's own list verb answers properly.
 *
 * Two shapes, because a group has two directions: `subjects` means both
 * endpoints are subjects of `predicate` pointing at `node` (both are
 * `ds:Component`s, both in the `ds:global` tier); `objects` means both are
 * objects of `node` asserting `predicate` (both covered by one modifier
 * family's 359 `dt:covers` edges). Reporting these is what separates "unrelated
 * in the model, though they do share membership" from "unrelated, full stop".
 */
export interface SharedRoster {
  /** Which side of the group the two endpoints sit on. */
  readonly side: "subjects" | "objects";
  readonly predicate: ConnectTerm;
  /** The group's other end: the shared object, or the shared subject. */
  readonly node: ConnectTerm;
  /** The TRUE size of the group — why it is a roster and not a relation. */
  readonly members: number;
}

/** One endpoint of the question, as the store resolved it. */
export interface ConnectEndpoint {
  /** The value the caller supplied, verbatim. */
  readonly input: string;
  readonly term: ConnectTerm;
  /**
   * False when this endpoint carries no walkable relation edge in either
   * direction — it is in the graph, but only classified. Nothing can be
   * connected to it, which is a different answer from "nothing is".
   */
  readonly relatable: boolean;
  /**
   * The roster groups that classify an endpoint, present only when
   * {@link relatable} is false — the answer to "then what IS it?", which is
   * the only useful thing to say about a node with no relations.
   */
  readonly classifiedBy?: readonly SharedRoster[];
}

/**
 * Why an unconnected pair is unconnected. Three of `CN.07`'s five cases; the
 * other two are refusals rather than answers (an absent name throws
 * `ENTITY_NOT_FOUND` naming which argument, an unbound namespace throws
 * `STORE_UNAVAILABLE`), because neither may make a connectivity claim at all.
 */
export type ConnectRefusal =
  /** An endpoint carries no relation edge — see {@link ConnectEndpoint.relatable}. */
  | "endpoint-carries-no-relation"
  /** The walk exhausted, but the two share membership — {@link ConnectResult.sharedRosters}. */
  | "shares-only-rosters"
  /** The walk exhausted with nothing in common at all. */
  | "no-path-within-hop-limit";

/** The answer to one `graph connect` question. */
export interface ConnectResult {
  readonly a: ConnectEndpoint;
  readonly b: ConnectEndpoint;
  readonly connected: boolean;
  /** Which negative answer this is; absent when {@link connected}. */
  readonly unconnectedBecause?: ConnectRefusal;
  /** The shortest-path length, or null when there is no path. */
  readonly hops: number | null;
  /** How many distinct shortest paths there are — the truth behind `paths`. */
  readonly pathCount: number;
  /** The shortest paths, ranked and capped by `--paths`. */
  readonly paths: readonly ConnectPath[];
  /** Set when `paths` is shorter than {@link pathCount}. */
  readonly truncated?: true;
  /** Roster groups both endpoints belong to (see {@link SharedRoster}). */
  readonly sharedRosters: readonly SharedRoster[];
  /** The hop limit actually applied to this walk. */
  readonly hopLimit: number;
  /** The fan-in above which an edge was refused as a roster. */
  readonly rosterThreshold: number;
  /** The packs the answering store was built from, as it records them. */
  readonly packs: readonly string[];
}
