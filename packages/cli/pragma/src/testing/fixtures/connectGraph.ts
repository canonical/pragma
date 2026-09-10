/**
 * A fixture graph authored to exercise `graph connect`'s traversal POLICY and
 * every one of its five negative answers.
 *
 * This is where exact numbers belong. The shipped pack is about to change —
 * new channel symbols and hundreds of binding records will move every hop count
 * and path set in it — so a test that pinned "these two are exactly 2 hops
 * apart" against real data would fail on a correct change and teach a
 * maintainer to update the fixture rather than to think. Here the data is
 * authored, so the numbers ARE the specification: this graph exists to make one
 * statement per shape, and if a count moves, the behaviour moved.
 *
 * The roster sizes are GENERATED from the kernel's own threshold rather than
 * written out, for the reason `blockGraph.ts` gives for the same move: the count
 * is the whole point of the case, and a hand-copied number invites someone to
 * tidy one line away and quietly turn a roster back into a relation. They are
 * also derived from the constant rather than a copy of it, so a change to the
 * threshold moves this fixture with it.
 *
 * What each region is for:
 *
 * - **the chain** `ds:a1 … ds:a8`, one predicate, one edge per node: hop
 *   counting, the default limit, the `--hops` ceiling, and the "no path within
 *   the limit" answer. Deliberately UNTYPED — a class with eight members is a
 *   relation under the fan-in rule, so typing them would connect every pair of
 *   them through their class in two hops and there would be no unconnected pair
 *   left to test.
 * - **the reversed pair** `ds:r1 … ds:r3`: a path that has to be walked against
 *   the direction of one of its edges.
 * - **the fan of three routes** `ds:m1 … ds:m2`: several shortest paths, both
 *   ranking tiebreaks, and the path cap.
 * - **`ds:shares` twice over**: ONE predicate carrying a roster group and a
 *   relation group, which is what a rule keyed on a predicate NAME could never
 *   get right.
 * - **`ds:fansTo`**: the other direction of the same rule — one subject fanning
 *   out past the threshold.
 * - **`ds:isolated`**: in the graph, but with nothing walkable on it at all.
 * - **the blank-node bridge**: a path THROUGH a record, which is the traversal
 *   a per-layer SPARQL query cannot do because a blank node cannot be re-bound
 *   by name.
 */

import { ROSTER_THRESHOLD } from "../../kernel/runtime/readEntity.js";

/** The prefixes the fixture store is built and queried with. */
export const CONNECT_PREFIXES: Readonly<Record<string, string>> = {
  ds: "https://ds.canonical.com/",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

/** How long the hop-counting chain is — long enough to outrun the ceiling. */
export const CHAIN_LENGTH = 8;

/**
 * How many members a group needs to be a roster: one clear of the threshold,
 * plus one so that removing a line does not silently reclassify the group.
 */
export const ROSTER_SIZE = ROSTER_THRESHOLD + 2;

/**
 * The true size of the `(ds:shares, ds:hub)` group: the generated members plus
 * `ds:isolated`, which shares the hub precisely so that it has nothing walkable
 * of its own. Stated rather than left to be recounted, because it is the number
 * the answer reports.
 */
export const HUB_ROSTER_SIZE = ROSTER_SIZE + 1;

/** `ds:a1 -> ds:a2 -> … -> ds:a8`, one admitted edge per link. */
const CHAIN = Array.from(
  { length: CHAIN_LENGTH - 1 },
  (_, index) => `ds:a${index + 1} ds:linksTo ds:a${index + 2} .`,
).join("\n");

/**
 * `ROSTER_SIZE` subjects all asserting `ds:shares ds:hub` — so the group
 * `(ds:shares, ds:hub)` fans in past the threshold and every one of those edges
 * is refused. Each member also holds ONE private relation, so it is still a
 * node the walk can start from: an endpoint with no relation at all is a
 * different answer, and `ds:isolated` is where that one is tested.
 */
const ROSTER = Array.from(
  { length: ROSTER_SIZE },
  (_, index) =>
    `ds:member${index} a ds:Probe ; ds:shares ds:hub ; ds:owns ds:private${index} .`,
).join("\n");

/**
 * One subject asserting `ds:fansTo` at `ROSTER_SIZE` objects — the OTHER
 * direction of the same rule. Its objects share a roster; none of the edges is
 * walkable. Each object holds one private relation, for the same reason the
 * roster members do.
 */
const FAN = `ds:fanHub ${Array.from(
  { length: ROSTER_SIZE },
  (_, index) => `ds:fansTo ds:leaf${index}`,
).join(" ; ")} .
${Array.from(
  { length: ROSTER_SIZE },
  (_, index) => `ds:leaf${index} ds:owns ds:leafPrivate${index} .`,
).join("\n")}`;

/** The fixture ontology + individuals as Turtle. */
export const CONNECT_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# ---- Ontology (TBox) ----
ds:Probe a owl:Class ; rdfs:label "Probe" .
ds:Record a owl:Class ; rdfs:label "Record" .

ds:linksTo a owl:ObjectProperty ; rdfs:label "linksTo" .
ds:pointsAt a owl:ObjectProperty ; rdfs:label "pointsAt" .
ds:alpha a owl:ObjectProperty ; rdfs:label "alpha" .
ds:beta a owl:ObjectProperty ; rdfs:label "beta" .
ds:gamma a owl:ObjectProperty ; rdfs:label "gamma" .
ds:shares a owl:ObjectProperty ; rdfs:label "shares" .
ds:fansTo a owl:ObjectProperty ; rdfs:label "fansTo" .
ds:owns a owl:ObjectProperty ; rdfs:label "owns" .
ds:holds a owl:ObjectProperty ; rdfs:label "holds" .
ds:refers a owl:ObjectProperty ; rdfs:label "refers" .

# ---- The chain: hop counting, the limit, and the ceiling ----
${CHAIN}

# ---- The reversed pair: r1 <-pointsAt- r2 -pointsAt-> r3 ----
ds:r2 ds:pointsAt ds:r1 , ds:r3 .

# ---- Three shortest routes from m1 to m2, for ranking and the path cap ----
# via1 stays inside ds:alpha; via3 stays inside ds:gamma; via2 mixes the two.
# So the ranking's second key (fewest distinct predicates) puts via1 and via3
# ahead of via2, and its third key (lexicographic) settles alpha before gamma.
ds:m1 ds:alpha ds:via1 , ds:via2 .
ds:via1 ds:alpha ds:m2 .
ds:via2 ds:beta ds:m2 .
ds:m1 ds:gamma ds:via3 .
ds:via3 ds:gamma ds:m2 .

# ---- ds:shares, as a ROSTER: ${ROSTER_SIZE} subjects on one object ----
${ROSTER}

# ---- ds:shares, as a RELATION: two subjects on one object ----
# The SAME predicate as the roster above. Nothing about the name distinguishes
# these edges; only the fan-in does.
ds:relA a ds:Probe ; ds:shares ds:small .
ds:relB a ds:Probe ; ds:shares ds:small .

# ---- ds:fansTo: one subject past the threshold, the other direction ----
${FAN}

# ---- In the graph, but nothing walkable on it ----
ds:isolated a ds:Probe ; ds:shares ds:hub .

# ---- A path THROUGH a blank-node record ----
ds:bridgeStart ds:holds [ a ds:Record ; ds:refers ds:bridgeEnd ] .
`;
