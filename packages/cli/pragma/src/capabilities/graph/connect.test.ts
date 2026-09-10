/**
 * `graph connect` over a fixture graph authored for it.
 *
 * The five negative answers and the traversal policy are tested HERE, against
 * data this repo owns, because that is the only place exact numbers mean
 * anything: the shipped pack's hop counts and path sets will move the moment new
 * symbols and binding records land, so pinning them there would fail on a
 * correct change. What the shipped pack is tested for is invariants — see
 * `connect.shipped.exec.test.ts`.
 *
 * Each of the five causes is reached, and each is asserted to be
 * DISTINGUISHABLE from the other four: two refusals with different codes, and
 * three answers with different discriminators. That is the whole point of
 * `connect`'s output contract — a caller who cannot tell "I have never heard of
 * this name" from "these two are unrelated" has been told nothing.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { ROSTER_THRESHOLD } from "../../kernel/runtime/readEntity.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  CHAIN_LENGTH,
  CONNECT_PREFIXES,
  CONNECT_TTL,
  HUB_ROSTER_SIZE,
  ROSTER_SIZE,
} from "../../testing/fixtures/connectGraph.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import type { ConnectResult } from "./connect.types.js";
import { graphModule } from "./index.js";

const DS = "https://ds.canonical.com/";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const connect = graphModule.verbs.find(
  (v) => verbKey(v.path) === "graph connect",
) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({
    ttl: CONNECT_TTL,
    prefixes: CONNECT_PREFIXES,
  }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

/** Ask one connect question through the verb, as a projector would. */
async function ask(
  a: string,
  b: string,
  options: { hops?: number; paths?: number } = {},
): Promise<ConnectResult> {
  return (await connect.run({ a, b, ...options }, rt)) as ConnectResult;
}

/** The error a question raises, or `undefined` when it answered. */
async function refusal(
  a: string,
  b: string,
  options: { hops?: number; paths?: number } = {},
): Promise<{ code?: string; message: string; suggestions?: string[] }> {
  try {
    await ask(a, b, options);
  } catch (error) {
    return error as { code?: string; message: string; suggestions?: string[] };
  }
  throw new Error(`connect ${a} ${b} answered where it should have refused`);
}

describe("graph connect — the traversal policy", () => {
  it("walks a chain and reports the hop count and the limit it used", async () => {
    const result = await ask("ds:a1", "ds:a5");
    expect(result.connected).toBe(true);
    expect(result.hops).toBe(4);
    expect(result.pathCount).toBe(1);
    expect(result.paths[0]?.steps).toHaveLength(4);
    expect(result.hopLimit).toBe(4);
    expect(result.rosterThreshold).toBe(ROSTER_THRESHOLD);
  });

  it("walks each step in the direction the triple is asserted", async () => {
    // ds:r2 points at BOTH ends, so the only route runs against the first
    // edge's direction. A path that dropped `direction` would claim
    // `ds:r1 ds:pointsAt ds:r2`, which the graph does not assert.
    const result = await ask("ds:r1", "ds:r3");
    expect(result.connected).toBe(true);
    expect(result.paths[0]?.steps.map((step) => step.direction)).toEqual([
      "reverse",
      "forward",
    ]);
    expect(result.paths[0]?.steps.map((step) => step.to.value)).toEqual([
      `${DS}r2`,
      `${DS}r3`,
    ]);
  });

  it("walks THROUGH a blank-node record", async () => {
    // The traversal a per-layer SPARQL query cannot do: a blank node's label is
    // not a legal IRI, so a frontier query either fails or drops it silently.
    const result = await ask("ds:bridgeStart", "ds:bridgeEnd");
    expect(result.connected).toBe(true);
    expect(result.hops).toBe(2);
    const middle = result.paths[0]?.steps[0]?.to;
    expect(middle?.addressable).toBe(false);
    expect(result.paths[0]?.steps[1]?.from.value).toBe(middle?.value);
  });

  it("returns ONLY shortest paths, all of one length, ranked and distinct", async () => {
    const result = await ask("ds:m1", "ds:m2");
    expect(result.hops).toBe(2);
    expect(result.pathCount).toBe(3);
    for (const path of result.paths) expect(path.steps).toHaveLength(2);
    // Ranked by fewest distinct predicates, then lexicographically: the two
    // single-family routes come first, alpha before gamma, and the route that
    // mixes two predicates comes last.
    expect(result.paths.map((path) => path.steps[0]?.to.value)).toEqual([
      `${DS}via1`,
      `${DS}via3`,
      `${DS}via2`,
    ]);
    expect(result.truncated).toBeUndefined();
  });

  it("caps the paths shown but never the count, and says it truncated", async () => {
    const capped = await ask("ds:m1", "ds:m2", { paths: 1 });
    expect(capped.paths).toHaveLength(1);
    expect(capped.pathCount).toBe(3);
    expect(capped.truncated).toBe(true);
    // A cap above the true count is not a truncation.
    const generous = await ask("ds:m1", "ds:m2", { paths: 99 });
    expect(generous.paths).toHaveLength(3);
    expect(generous.truncated).toBeUndefined();
  });

  it("honours --hops, up to its ceiling, and refuses above it", async () => {
    // The chain is longer than the ceiling, so it can be walked to the ceiling
    // and still have a pair the ceiling cannot reach.
    expect((await ask("ds:a1", "ds:a6")).connected).toBe(false);
    const raised = await ask("ds:a1", "ds:a6", { hops: 5 });
    expect(raised.connected).toBe(true);
    expect(raised.hops).toBe(5);
    expect(raised.hopLimit).toBe(5);
    const ceiling = await ask("ds:a1", "ds:a7", { hops: 6 });
    expect(ceiling.connected).toBe(true);
    expect(ceiling.hops).toBe(6);

    // Above the ceiling it REFUSES rather than clamping: a clamped limit is a
    // limit the answer would report without the caller having set it.
    const tooFar = await refusal("ds:a1", "ds:a7", { hops: 7 });
    expect(tooFar.code).toBe("INVALID_INPUT");
    expect(tooFar.message).toContain("7");
    const notWhole = await refusal("ds:a1", "ds:a7", { hops: 2.5 });
    expect(notWhole.code).toBe("INVALID_INPUT");
  });

  it("classifies each edge, not each predicate name", async () => {
    // ONE predicate, two group sizes. `ds:shares` fans in past the threshold on
    // ds:hub and stays under it on ds:small, so the same predicate is a roster
    // at one node and a real relation at another. No rule keyed on a predicate
    // NAME can produce both of these answers.
    const relation = await ask("ds:relA", "ds:relB");
    expect(relation.connected).toBe(true);
    expect(relation.hops).toBe(2);
    expect(relation.paths[0]?.steps[0]?.predicate.value).toBe(`${DS}shares`);

    const roster = await ask("ds:member0", "ds:member1");
    expect(roster.connected).toBe(false);
    expect(
      roster.sharedRosters.map((group) => group.predicate.value),
    ).toContain(`${DS}shares`);
  });

  it("applies the rule in BOTH directions of a group", async () => {
    // ds:fanHub fans OUT past the threshold, so its edges are refused for the
    // (subject, predicate) half of the rule — the half a rule that only counted
    // inbound fan-in would miss entirely.
    const result = await ask("ds:leaf0", "ds:leaf1");
    expect(result.connected).toBe(false);
    expect(result.sharedRosters).toEqual([
      {
        side: "objects",
        predicate: expect.objectContaining({ value: `${DS}fansTo` }),
        node: expect.objectContaining({ value: `${DS}fanHub` }),
        members: ROSTER_SIZE,
      },
    ]);
  });

  it("answers the same path set whichever way round it is asked", async () => {
    const forwards = await ask("ds:m1", "ds:m2");
    const backwards = await ask("ds:m2", "ds:m1");
    expect(backwards.hops).toBe(forwards.hops);
    expect(backwards.pathCount).toBe(forwards.pathCount);
    // The same paths, walked the other way: reverse the step order, swap each
    // step's ends, and flip its direction.
    const mirrored = backwards.paths.map((path) =>
      [...path.steps].reverse().map((step) => ({
        from: step.to.value,
        to: step.from.value,
        predicate: step.predicate.value,
        direction: step.direction === "forward" ? "reverse" : "forward",
      })),
    );
    const original = forwards.paths.map((path) =>
      path.steps.map((step) => ({
        from: step.from.value,
        to: step.to.value,
        predicate: step.predicate.value,
        direction: step.direction,
      })),
    );
    expect(mirrored.map((p) => JSON.stringify(p)).sort()).toEqual(
      original.map((p) => JSON.stringify(p)).sort(),
    );
  });
});

describe("graph connect — the five negative answers, each distinguishable", () => {
  it("(a) refuses an absent name, naming WHICH argument, with suggestions", async () => {
    const first = await refusal("ds:membre0", "ds:a1");
    expect(first.code).toBe("ENTITY_NOT_FOUND");
    expect(first.message).toContain("<a>");
    expect(first.message).toContain("ds:membre0");
    // A name-similarity suggestion, from the same index the argument's own
    // shell completion draws on.
    expect(first.suggestions).toContain("ds:member0");
    // And never a connectivity VERDICT: a typo must not be reported as a fact
    // about how two things relate. (Saying that nothing can be said is the
    // opposite of a claim, so the check is for the verdicts themselves.)
    expect(first.message).not.toMatch(
      /not connected|unrelated|no path|no relation/i,
    );

    // The SECOND argument is named as the second argument.
    const second = await refusal("ds:a1", "ds:nosuchthing");
    expect(second.code).toBe("ENTITY_NOT_FOUND");
    expect(second.message).toContain("<b>");
  });

  it("(b) answers that an endpoint carries no relation, and says what it is", async () => {
    const result = await ask("ds:isolated", "ds:a1");
    expect(result.connected).toBe(false);
    expect(result.unconnectedBecause).toBe("endpoint-carries-no-relation");
    expect(result.a.relatable).toBe(false);
    expect(result.b.relatable).toBe(true);
    // "Then what IS it?" — the groups that classify it, which is all there is
    // to say about a node with no relations.
    const classifiers = (result.a.classifiedBy ?? []).map(
      (group) => group.predicate.value,
    );
    expect(classifiers).toContain(RDF_TYPE);
    expect(classifiers).toContain(`${DS}shares`);
  });

  it("(c) answers that there is no path within the limit", async () => {
    const result = await ask("ds:a1", `ds:a${CHAIN_LENGTH}`);
    expect(result.connected).toBe(false);
    expect(result.unconnectedBecause).toBe("no-path-within-hop-limit");
    expect(result.hops).toBeNull();
    expect(result.paths).toEqual([]);
    // Nothing in common at all — which is what separates this from (d).
    expect(result.sharedRosters).toEqual([]);
    // Both endpoints ARE relatable, which is what separates it from (b).
    expect(result.a.relatable).toBe(true);
    expect(result.b.relatable).toBe(true);
  });

  it("(d) answers that the two share only membership, and names it", async () => {
    const result = await ask("ds:member0", "ds:member1");
    expect(result.connected).toBe(false);
    expect(result.unconnectedBecause).toBe("shares-only-rosters");
    expect(result.a.relatable).toBe(true);
    expect(result.b.relatable).toBe(true);
    const hub = result.sharedRosters.find(
      (group) => group.node.value === `${DS}hub`,
    );
    expect(hub).toMatchObject({
      side: "subjects",
      members: HUB_ROSTER_SIZE,
    });
  });

  it("(e) REFUSES when no loaded pack binds an endpoint's namespace", async () => {
    // Staleness, not a fact about the model — and the dangerous one, because a
    // missing pack makes the honest "no path" and the dishonest one identical.
    // So it refuses with the store's own recovery instead of answering.
    const result = await refusal("https://unloaded.example/thing", "ds:a1");
    expect(result.code).toBe("STORE_UNAVAILABLE");
    expect(result.message).toContain("https://unloaded.example/thing");
    expect(result.message).not.toMatch(
      /not connected|unrelated|no path|no relation/i,
    );
    // The recovery the kernel already mints for a store that cannot answer.
    expect(
      (result as { recovery?: { cli?: string; mcp?: { tool: string } } })
        .recovery?.cli,
    ).toContain("sources update");
    expect(
      (result as { recovery?: { mcp?: { tool: string } } }).recovery?.mcp?.tool,
    ).toBe("sources_update");
  });

  it("keeps all five apart — five causes, five distinct discriminators", async () => {
    const absent = await refusal("ds:nosuchthing", "ds:a1");
    const unbound = await refusal("https://unloaded.example/thing", "ds:a1");
    const answers = await Promise.all([
      ask("ds:isolated", "ds:a1"),
      ask("ds:a1", `ds:a${CHAIN_LENGTH}`),
      ask("ds:member0", "ds:member1"),
    ]);
    // The two refusals carry different codes...
    expect(new Set([absent.code, unbound.code]).size).toBe(2);
    // ...and the three answers carry different reasons, none of them empty.
    const reasons = answers.map((answer) => answer.unconnectedBecause);
    expect(new Set(reasons).size).toBe(3);
    for (const answer of answers) {
      expect(answer.connected).toBe(false);
      expect(answer.unconnectedBecause).toBeDefined();
    }
  });
});

describe("graph connect — what every answer states about itself", () => {
  it("reports the packs the answering store was actually built from", async () => {
    const session = await rt.store.get();
    const result = await ask("ds:a1", "ds:a2");
    expect(result.packs).toEqual(
      session.manifest.sourceRef
        .split(",")
        .map((ref) => ref.trim())
        .filter((ref) => ref.length > 0),
    );
  });

  it("states its policy on a NEGATIVE answer too", async () => {
    // The cheapest answer is the one most in need of context: without the
    // limit, the threshold and the packs, "not connected" is unfalsifiable.
    const result = await ask("ds:a1", `ds:a${CHAIN_LENGTH}`, { hops: 3 });
    expect(result.hopLimit).toBe(3);
    expect(result.rosterThreshold).toBe(ROSTER_THRESHOLD);
    expect(result.packs.length).toBeGreaterThan(0);
  });

  it("refuses two spellings of the same entity rather than answering 0 hops", async () => {
    const result = await refusal("ds:a1", `${DS}a1`);
    expect(result.code).toBe("INVALID_INPUT");
  });

  it("refuses an unknown prefix as invalid input, naming the loaded ones", async () => {
    const result = await refusal("nope:a1", "ds:a1");
    expect(result.code).toBe("INVALID_INPUT");
    expect((result as { validOptions?: string[] }).validOptions).toContain(
      "ds",
    );
  });
});
