/**
 * The `graph connect` run body (lazily imported, off the fast path).
 *
 * Answers one question — what connects these two entities — and, far more
 * often, says honestly that nothing does. On the pack this CLI ships, 97% of
 * arbitrary pairs are not connected by any relation within the hop limit, so
 * the negative answer is the primary output rather than an error or an empty
 * result. It has five causes and they must never be conflated:
 *
 * | Case | Detected by | Shape |
 * |---|---|---|
 * | the namespace is bound by no loaded pack | the resolved IRI against the session's prefix map | REFUSES — `STORE_UNAVAILABLE` |
 * | the name is not in the store | one `ASK` per endpoint, both positions | REFUSES — `ENTITY_NOT_FOUND`, naming which argument |
 * | it is there, but carries no relation | absent from the relation index | answer, `endpoint-carries-no-relation` |
 * | a path exists only through rosters | the walk exhausts and the two share a roster group | answer, `shares-only-rosters` |
 * | no path within the limit | the walk exhausts with nothing shared | answer, `no-path-within-hop-limit` |
 *
 * The first two REFUSE rather than answer, and that is the point of the
 * ordering. Staleness is checked before existence because a pack that is not
 * loaded makes an honest "no path" and a dishonest one byte-identical; and an
 * absent name is checked before any traversal because "I have never heard of
 * this" must never be dressed up as "these are unrelated". Neither refusal makes
 * a connectivity claim of any kind.
 *
 * The walk itself is a BOUNDED BIDIRECTIONAL breadth-first search over the
 * session's relation index, in code. A SPARQL property path was measured and
 * rejected: with a wildcard predicate every reachability question answers true,
 * and — fatally — a property path returns reachability, never the path, which
 * is the whole answer. A per-layer frontier query cannot re-bind a blank node
 * by name, so it silently drops the 6,942 blank nodes carrying the token
 * graph's records from the frontier. This walk traverses them.
 */

import type { QueryResult } from "@canonical/ke";
import { cliRecovery, PragmaError } from "../../kernel/error/index.js";
import { resolveUri } from "../../kernel/packs/iri.js";
import { suggestNames } from "../../kernel/project/cli/suggestNames.js";
import { ROSTER_THRESHOLD } from "../../kernel/runtime/readEntity.js";
import { storeUnavailable } from "../../kernel/runtime/storeReadiness.js";
import type {
  PragmaRuntime,
  StoreSession,
} from "../../kernel/runtime/types.js";
import type {
  ConnectEndpoint,
  ConnectPath,
  ConnectResult,
  ConnectStep,
} from "./connect.types.js";
import type { RelationEdge, RelationIndex } from "./relationIndex.js";
import {
  relationIndex,
  rosterMemberships,
  sharedRosters,
} from "./relationIndex.js";

/**
 * A safety ceiling on how many distinct shortest paths are ENUMERATED.
 *
 * Not a cap on the answer — `--paths` is that — but a bound on the cross
 * product a pathological pair could produce. Stated rather than implicit, and
 * far above what the graph produces: the measured maximum over a thousand
 * random pairs is 18. When it bites, `pathCount` is that ceiling and
 * `truncated` is set, so the answer never claims to have counted more than it
 * looked at.
 */
const ENUMERATION_CEILING = 5000;

/** Field separator for composite keys — illegal in an IRI, so unambiguous. */
const SEP = " ";

/** How a node was reached: from a neighbour one layer nearer the source. */
interface Arrival {
  readonly other: string;
  readonly predicate: string;
  /** True when the asserted triple is `(other, predicate, this node)`. */
  readonly forward: boolean;
}

/** One side of the bidirectional search. */
interface Side {
  readonly dist: Map<string, number>;
  readonly arrivals: Map<string, Arrival[]>;
  frontier: string[];
  radius: number;
}

/** Options a caller may set on a connect question. */
export interface ConnectOptions {
  readonly hops: number;
  readonly paths: number;
}

/**
 * Answer one connect question.
 *
 * @param rt - The per-invocation runtime (its store is booted by the dispatcher).
 * @param a - The first endpoint, as a prefixed name or an absolute IRI.
 * @param b - The second endpoint, in the same forms.
 * @param options - The hop limit and path cap in force.
 * @returns The answer: the shortest paths, or which kind of nothing this is.
 * @throws PragmaError STORE_UNAVAILABLE when an endpoint's namespace is bound
 *   by no loaded pack; ENTITY_NOT_FOUND when an endpoint is not in the store;
 *   INVALID_INPUT when the two endpoints are the same entity.
 * @note Impure — boots the store, and scans it once per session.
 */
export async function runConnect(
  rt: PragmaRuntime,
  a: string,
  b: string,
  options: ConnectOptions,
): Promise<ConnectResult> {
  const session = await rt.store.get();
  const resolvedA = resolveUri(a, session.prefixes);
  const resolvedB = resolveUri(b, session.prefixes);

  // (e) Staleness first. A namespace no loaded pack binds cannot be reasoned
  // about at all, and the answer it would otherwise get — "not connected" — is
  // the one wrong answer this verb must never give.
  assertNamespaceLoaded(session, a, resolvedA);
  assertNamespaceLoaded(session, b, resolvedB);

  if (resolvedA === resolvedB) {
    throw PragmaError.invalidInput("arguments", `${a} / ${b}`, {
      recovery: {
        message:
          "Both arguments name the same entity. Give two different endpoints, or inspect the one.",
      },
    });
  }

  // (a) Existence, before any traversal, in EITHER position — an entity that is
  // only ever an object is still in the graph.
  await assertPresent(rt, session, "<a>", a, resolvedA);
  await assertPresent(rt, session, "<b>", b, resolvedB);

  const index = await relationIndex({ session, sparql: rt.query.sparql });
  const shared = sharedRosters(index, resolvedA, resolvedB);
  const endpointA = endpoint(index, a, resolvedA);
  const endpointB = endpoint(index, b, resolvedB);

  const policy = {
    sharedRosters: shared,
    hopLimit: options.hops,
    rosterThreshold: ROSTER_THRESHOLD,
    packs: loadedPacks(session),
  } as const;

  // (b) An endpoint with no relation at all: nothing CAN be connected to it,
  // which is a different statement from "nothing is".
  if (!endpointA.relatable || !endpointB.relatable) {
    return {
      a: endpointA,
      b: endpointB,
      connected: false,
      unconnectedBecause: "endpoint-carries-no-relation",
      hops: null,
      pathCount: 0,
      paths: [],
      ...policy,
    };
  }

  const found = walk(index, resolvedA, resolvedB, options.hops);
  if (found === undefined) {
    return {
      a: endpointA,
      b: endpointB,
      connected: false,
      // (d) versus (c): sharing membership is a real, if lesser, relationship,
      // and an answer that could not tell the two apart would be one answer
      // where the graph holds two.
      unconnectedBecause:
        shared.length > 0 ? "shares-only-rosters" : "no-path-within-hop-limit",
      hops: null,
      pathCount: 0,
      paths: [],
      ...policy,
    };
  }

  const ranked = rank(found.paths.map((steps) => ({ steps })));
  const shown = ranked.slice(0, options.paths);
  return {
    a: endpointA,
    b: endpointB,
    connected: true,
    hops: found.hops,
    pathCount: ranked.length,
    paths: shown,
    ...(shown.length < ranked.length ? { truncated: true as const } : {}),
    ...policy,
  };
}

/** The packs the answering store records itself as having been built from. */
function loadedPacks(session: StoreSession): string[] {
  return session.manifest.sourceRef
    .split(",")
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0);
}

/**
 * Refuse when an endpoint's namespace is bound by no loaded pack.
 *
 * This is the staleness case, and it is the dangerous one: on a store missing a
 * pack, the honest "these are not connected" and the dishonest one are the same
 * bytes. So it refuses with the store-unavailable guidance the kernel already
 * mints, rather than answering.
 *
 * The check is COVERAGE by the loaded prefix map, never population of the
 * namespace. A namespace a loaded pack declares but asserts nothing in
 * (`dcterms:`, `dso:` on the shipped pack) is a genuine not-found, and refusing
 * there would be a false alarm on a perfectly healthy store. A prefixed name
 * whose PREFIX is unknown never reaches here — `resolveUri` rejects it as
 * invalid input, naming every prefix that is loaded.
 */
function assertNamespaceLoaded(
  session: StoreSession,
  input: string,
  resolved: string,
): void {
  for (const namespace of Object.values(session.prefixes)) {
    if (resolved.startsWith(namespace)) return;
  }
  throw storeUnavailable(
    `No loaded pack binds the namespace of "${input}", so this store cannot say what it relates to`,
  );
}

/**
 * Refuse when an endpoint is not in the store, naming WHICH argument.
 *
 * Never a connectivity claim: a caller who mistyped a name must not be told
 * that two things are unrelated, and the pair that is a not-found today
 * (`dt:modifier.color.text`, one of the channel symbols still to be minted) is
 * exactly the pair someone would ask about first.
 *
 * The suggestion comes from the pack index — the same source the argument's own
 * shell completion draws on, so a name the tab key would have offered is a name
 * the error offers too.
 */
async function assertPresent(
  rt: Pick<PragmaRuntime, "query">,
  session: StoreSession,
  label: string,
  input: string,
  resolved: string,
): Promise<void> {
  const present = await rt.query.sparql(
    `ASK { { <${resolved}> ?p ?o } UNION { ?s ?q <${resolved}> } UNION { ?s2 <${resolved}> ?o2 } }`,
  );
  if (asked(present)) return;
  const candidates = session.index.entities.map((entity) => entity.name);
  throw new PragmaError({
    code: "ENTITY_NOT_FOUND",
    message: `Argument ${label} "${input}" is not in the loaded graph, so nothing can be said about what it connects to.`,
    entity: { type: "entity", name: input },
    suggestions: suggestNames(input, candidates),
    // `cliRecovery` prepends the distribution's own binary name, so the
    // command passed here is the SUFFIX only.
    recovery: cliRecovery(
      `graph inspect ${input}`,
      "Check the name against the graph, or list the loaded namespaces.",
      { tool: "graph_inspect", params: { uri: input } },
    ),
  });
}

/** The boolean of an ASK result, false for anything else. */
function asked(result: QueryResult): boolean {
  return result.type === "ask" && result.result;
}

/** Project one endpoint, with what classifies it when it has no relations. */
function endpoint(
  index: RelationIndex,
  input: string,
  resolved: string,
): ConnectEndpoint {
  const relatable = index.adjacency.has(resolved);
  const classifiedBy = relatable ? [] : rosterMemberships(index, resolved);
  return {
    input,
    term: index.term(resolved),
    relatable,
    ...(classifiedBy.length > 0 ? { classifiedBy } : {}),
  };
}

/** The result of a successful walk: its length and every shortest path. */
interface Walked {
  readonly hops: number;
  readonly paths: ConnectStep[][];
}

/**
 * Bounded bidirectional breadth-first search for EVERY shortest path.
 *
 * Both sides expand a full layer at a time, always the side with the smaller
 * frontier. Once any node is in both balls the search stops, and that is sound
 * rather than merely convenient: with the two balls complete to radii `ra` and
 * `rb`, every path of length at most `ra + rb` has some node in both — so the
 * smallest total distance over the intersection IS the shortest distance, and
 * cannot be beaten by a path still undiscovered.
 *
 * Completeness follows from the same fact: for a shortest path of length L,
 * some node on it is a meeting node whose two distances sum to L, and that
 * node's two arrival maps hold every shortest way to reach it from either end.
 * A path can therefore be generated more than once — via different meeting
 * nodes — which is why the enumeration deduplicates.
 *
 * @param index - The session's relation index.
 * @param a - The resolved start node.
 * @param b - The resolved end node.
 * @param hopLimit - The largest path length that may be returned.
 * @returns The hop count and every distinct shortest path, or undefined.
 */
function walk(
  index: RelationIndex,
  a: string,
  b: string,
  hopLimit: number,
): Walked | undefined {
  const from: Side = {
    dist: new Map([[a, 0]]),
    arrivals: new Map(),
    frontier: [a],
    radius: 0,
  };
  const to: Side = {
    dist: new Map([[b, 0]]),
    arrivals: new Map(),
    frontier: [b],
    radius: 0,
  };

  let meeting = meet(from, to);
  while (meeting === undefined) {
    if (from.radius + to.radius >= hopLimit) return undefined;
    const side = cheaperSide(from, to);
    // Both balls exhausted without meeting: the two sit in different
    // components of the relation graph, and no hop limit would help.
    if (side === undefined) return undefined;
    expand(index, side);
    meeting = meet(from, to);
  }

  return {
    hops: meeting.distance,
    paths: enumerate(index, from, to, meeting.nodes),
  };
}

/**
 * The side to expand next: the one with the smaller frontier.
 *
 * A side whose frontier has emptied has visited its whole component, so it can
 * never be worth expanding again — but the OTHER side still can, and may yet
 * reach into the exhausted ball. Aborting when either side empties would lose
 * exactly those answers, so this only gives up when both are done.
 */
function cheaperSide(from: Side, to: Side): Side | undefined {
  if (from.frontier.length === 0) {
    return to.frontier.length === 0 ? undefined : to;
  }
  if (to.frontier.length === 0) return from;
  return from.frontier.length <= to.frontier.length ? from : to;
}

/** The meeting nodes at the smallest total distance, once there are any. */
function meet(
  from: Side,
  to: Side,
): { distance: number; nodes: string[] } | undefined {
  const [inner, outer] =
    from.dist.size <= to.dist.size ? [from, to] : [to, from];
  let best = Number.POSITIVE_INFINITY;
  let nodes: string[] = [];
  for (const [node, near] of inner.dist) {
    const far = outer.dist.get(node);
    if (far === undefined) continue;
    const total = near + far;
    if (total < best) {
      best = total;
      nodes = [node];
    } else if (total === best) nodes.push(node);
  }
  return nodes.length > 0 ? { distance: best, nodes } : undefined;
}

/**
 * Expand one side of the search by exactly one layer.
 *
 * A neighbour already known at a SHALLOWER depth is not on any shortest path
 * through this layer and is skipped; a neighbour reached again within the SAME
 * layer records a second arrival, which is how a pair with several shortest
 * paths keeps all of them.
 */
function expand(index: RelationIndex, side: Side): void {
  const depth = side.radius + 1;
  const next = new Set<string>();
  for (const node of side.frontier) {
    for (const edge of index.adjacency.get(node) ?? []) {
      const known = side.dist.get(edge.to);
      if (known !== undefined && known < depth) continue;
      if (known === undefined) side.dist.set(edge.to, depth);
      arrive(side, edge, node);
      next.add(edge.to);
    }
  }
  side.frontier = [...next];
  side.radius = depth;
}

/**
 * Record how a node was reached.
 *
 * No duplicate check, and that is a claim about the index rather than an
 * oversight: the scan deduplicates by triple, so one node's adjacency list
 * holds each `(neighbour, predicate, direction)` at most once and no arrival
 * can repeat. The check that used to be here was therefore dead — and it cost
 * 704 ms on one measured pair, because scanning the list for every edge is
 * quadratic in the number of parents a hub is reached from.
 */
function arrive(side: Side, edge: RelationEdge, from: string): void {
  const arrival: Arrival = {
    other: from,
    predicate: edge.predicate,
    forward: edge.forward,
  };
  const list = side.arrivals.get(edge.to);
  if (list) list.push(arrival);
  else side.arrivals.set(edge.to, [arrival]);
}

/**
 * Every distinct shortest path, assembled from the two arrival maps.
 *
 * Deduplicated by the path's own canonical form, because one path is reachable
 * through several meeting nodes and the answer promises distinct paths.
 */
function enumerate(
  index: RelationIndex,
  from: Side,
  to: Side,
  meetingNodes: readonly string[],
): ConnectStep[][] {
  const heads = new Map<string, ConnectStep[][]>();
  const tails = new Map<string, ConnectStep[][]>();
  const distinct = new Map<string, ConnectStep[]>();

  for (const node of meetingNodes) {
    const before = head(index, from, node, heads);
    const after = tail(index, to, node, tails);
    for (const start of before) {
      for (const finish of after) {
        if (distinct.size >= ENUMERATION_CEILING) {
          return [...distinct.values()];
        }
        const steps = [...start, ...finish];
        distinct.set(canonical(steps), steps);
      }
    }
  }
  return [...distinct.values()];
}

/** Every shortest walk from the start endpoint to `node`, memoised. */
function head(
  index: RelationIndex,
  side: Side,
  node: string,
  memo: Map<string, ConnectStep[][]>,
): ConnectStep[][] {
  const cached = memo.get(node);
  if (cached) return cached;
  if (side.dist.get(node) === 0) {
    const base: ConnectStep[][] = [[]];
    memo.set(node, base);
    return base;
  }
  const paths: ConnectStep[][] = [];
  for (const arrival of side.arrivals.get(node) ?? []) {
    const step: ConnectStep = {
      from: index.term(arrival.other),
      predicate: index.term(arrival.predicate),
      direction: arrival.forward ? "forward" : "reverse",
      to: index.term(node),
    };
    for (const prefix of head(index, side, arrival.other, memo)) {
      paths.push([...prefix, step]);
    }
  }
  memo.set(node, paths);
  return paths;
}

/**
 * Every shortest walk from `node` to the end endpoint, memoised.
 *
 * The end side's arrivals record edges pointing TOWARDS `b`, so each one is
 * traversed the other way round here — which flips the direction the step
 * reports, and is exactly why `direction` is part of the answer.
 */
function tail(
  index: RelationIndex,
  side: Side,
  node: string,
  memo: Map<string, ConnectStep[][]>,
): ConnectStep[][] {
  const cached = memo.get(node);
  if (cached) return cached;
  if (side.dist.get(node) === 0) {
    const base: ConnectStep[][] = [[]];
    memo.set(node, base);
    return base;
  }
  const paths: ConnectStep[][] = [];
  for (const arrival of side.arrivals.get(node) ?? []) {
    const step: ConnectStep = {
      from: index.term(node),
      predicate: index.term(arrival.predicate),
      direction: arrival.forward ? "reverse" : "forward",
      to: index.term(arrival.other),
    };
    for (const suffix of tail(index, side, arrival.other, memo)) {
      paths.push([step, ...suffix]);
    }
  }
  memo.set(node, paths);
  return paths;
}

/**
 * A path's canonical form: the sequence of directed predicates and targets.
 *
 * Both the deduplication key and the final tiebreak of the ranking, so the same
 * question asked twice gets the same answer in the same order — the entity
 * reader sorts for the same reason.
 */
function canonical(steps: readonly ConnectStep[]): string {
  return steps
    .map(
      (step) =>
        `${step.direction === "forward" ? ">" : "<"}${step.predicate.value}${SEP}${step.to.value}`,
    )
    .join("|");
}

/**
 * Rank the shortest paths: hop count, then fewest distinct predicates, then
 * canonically.
 *
 * Every path here is already the same length, so the hop-count key never
 * decides anything — it is kept because it is the FIRST key of the stated
 * ranking, and a ranking whose stated first key is absent from its code is a
 * ranking a reader cannot check. Fewest distinct predicates comes next because
 * a path that stays inside one relation family explains better than one that
 * hops vocabularies.
 */
function rank(paths: ConnectPath[]): ConnectPath[] {
  const families = new Map<ConnectPath, number>();
  for (const path of paths) {
    families.set(
      path,
      new Set(path.steps.map((step) => step.predicate.value)).size,
    );
  }
  return paths.sort(
    (x, y) =>
      x.steps.length - y.steps.length ||
      (families.get(x) ?? 0) - (families.get(y) ?? 0) ||
      canonical(x.steps).localeCompare(canonical(y.steps)),
  );
}
