/**
 * `graph connect` against the pack this CLI actually ships (PROTECTED).
 *
 * Nothing here pins a number the graph produces, and nothing snapshots an
 * answer. That is deliberate, and it is the whole design of this file. This
 * graph is about to change: new channel symbols will become addressable and
 * hundreds of binding records will be written, and every one of those moves a
 * hop count and a path set. A test that pinned "button is exactly 2 hops from
 * `color.text`" would go red on a correct change, and a snapshot of an answer's
 * bytes would go red on a formatting fix. Both teach a maintainer to update the
 * fixture rather than to think.
 *
 * So what is asserted here are INVARIANTS — properties that must hold whatever
 * the data says:
 *
 * - the relation rule holds over the verb's OWN output: no returned step is an
 *   edge the rule would have refused;
 * - every returned path is the same length, and that length is minimal;
 * - the returned paths are distinct, and two runs agree on their order;
 * - every step is an edge the store actually asserts, in the direction claimed,
 *   and the steps join end to end from one endpoint to the other;
 * - the limit and threshold reported are the ones applied;
 * - the packs reported are the packs the session loaded;
 * - asking the question the other way round returns the same paths mirrored.
 *
 * Every check asks the STORE, never the verb's own index — an answer checked
 * against the structure that produced it only proves the verb agrees with
 * itself. The questions are targeted at the nodes on the answer rather than
 * re-scanning the graph, which is both cheaper and a more direct question.
 *
 * Exact numbers live in `connect.test.ts`, over a fixture this repo authors.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { ROSTER_THRESHOLD } from "../../kernel/runtime/readEntity.js";
import type {
  PragmaRuntime,
  StoreSession,
} from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { TEST_FLAGS } from "../../testing/helpers/projectCli.js";
import type { ConnectPath, ConnectResult } from "./connect.types.js";
import { graphModule } from "./index.js";

const connect = graphModule.verbs.find(
  (v) => verbKey(v.path) === "graph connect",
) as VerbSpec;

/**
 * A pair that is connected on the shipped pack. Asserted to ANSWER, never to
 * answer with a particular number — the block subscribes to a modifier family
 * and that family rebinds the symbol, and if that route is ever rewritten the
 * properties below still describe a correct answer.
 */
const CONNECTED_PAIR = ["ds:global.component.button", "dt:color.text"] as const;

/** One store for the file — booting per case triples the cost for no coverage. */
let rt: PragmaRuntime;
let session: StoreSession;

beforeAll(async () => {
  rt = bootRuntime(TEST_FLAGS);
  session = await rt.store.get();
});
afterAll(() => {
  session.store.dispose();
});

/** Ask one connect question through the verb, as a projector would. */
async function ask(
  a: string,
  b: string,
  options: { hops?: number; paths?: number } = {},
): Promise<ConnectResult> {
  return (await connect.run({ a, b, ...options }, rt)) as ConnectResult;
}

/** One step of a path, as the answer reports it. */
type Step = ConnectPath["steps"][number];

/** The triple a step claims, as subject, predicate, object. */
function claimed(step: Step): {
  subject: Step["from"];
  predicate: string;
  object: Step["to"];
} {
  const forward = step.direction === "forward";
  return {
    subject: forward ? step.from : step.to,
    predicate: step.predicate.value,
    object: forward ? step.to : step.from,
  };
}

/**
 * Whether a term can be named in a query.
 *
 * A blank node cannot: its label is store-local and is not a legal IRI, which
 * is the very fact that rules out a per-layer SPARQL frontier and makes the
 * in-code walk necessary. A step with a blank node at one end is therefore
 * checked from its other end, and one blank at BOTH ends cannot be checked from
 * outside the index at all — recorded here rather than left as a silent pass.
 */
const nameable = (term: { addressable?: false }): boolean =>
  term.addressable !== false;

/** The number a `?n` counting query returns. */
async function count(query: string): Promise<number> {
  const result = await rt.query.sparql(query);
  if (result.type !== "select") return 0;
  const value = result.termBindings[0]?.n?.value;
  return value === undefined ? 0 : Number(value);
}

describe("graph connect over the shipped pack — invariants (PROTECTED)", () => {
  it("returns no step the relation rule would have refused", async () => {
    // The rule enforced against the verb's own output, from group sizes counted
    // by the STORE rather than taken from the index that produced the paths.
    const result = await ask(...CONNECTED_PAIR, { paths: 99 });
    expect(result.connected).toBe(true);
    let checked = 0;
    for (const path of result.paths) {
      for (const step of path.steps) {
        const { subject, predicate, object } = claimed(step);
        if (nameable(object)) {
          const subjectsSharing = await count(
            `SELECT (COUNT(*) AS ?n) WHERE { ?s <${predicate}> <${object.value}> }`,
          );
          expect(
            subjectsSharing,
            `(${predicate}, ${object.value}) is a roster of subjects, so this edge is not walkable`,
          ).toBeLessThanOrEqual(ROSTER_THRESHOLD);
          checked++;
        }
        if (nameable(subject)) {
          const objectsSharing = await count(
            `SELECT (COUNT(*) AS ?n) WHERE { <${subject.value}> <${predicate}> ?o . FILTER(!isLiteral(?o)) }`,
          );
          expect(
            objectsSharing,
            `(${subject.value}, ${predicate}) is a roster of objects, so this edge is not walkable`,
          ).toBeLessThanOrEqual(ROSTER_THRESHOLD);
          checked++;
        }
      }
    }
    expect(checked, "no group was actually checked").toBeGreaterThan(0);
  });

  it("walks only edges the store asserts, in the direction it asserts them", async () => {
    const result = await ask(...CONNECTED_PAIR, { paths: 99 });
    let checked = 0;
    for (const path of result.paths) {
      for (const step of path.steps) {
        const { subject, predicate, object } = claimed(step);
        // Asked from whichever end can be named, and the OTHER end's value is
        // read back out of the store — so a blank node is verified too, by the
        // label the store itself hands back.
        if (nameable(subject)) {
          const rows = await rt.query.sparql(
            `SELECT ?o WHERE { <${subject.value}> <${predicate}> ?o }`,
          );
          const objects =
            rows.type === "select"
              ? rows.termBindings.map((binding) => binding.o?.value)
              : [];
          expect(
            objects,
            `the store asserts no <${subject.value}> <${predicate}> <${object.value}>`,
          ).toContain(object.value);
          checked++;
        } else if (nameable(object)) {
          const rows = await rt.query.sparql(
            `SELECT ?s WHERE { ?s <${predicate}> <${object.value}> }`,
          );
          const subjects =
            rows.type === "select"
              ? rows.termBindings.map((binding) => binding.s?.value)
              : [];
          expect(subjects).toContain(subject.value);
          checked++;
        }
      }
    }
    expect(checked, "no step was actually checked").toBeGreaterThan(0);
  });

  it("returns paths that actually join one endpoint to the other", async () => {
    const result = await ask(...CONNECTED_PAIR, { paths: 99 });
    for (const path of result.paths) {
      expect(path.steps[0]?.from.value).toBe(result.a.term.value);
      expect(path.steps.at(-1)?.to.value).toBe(result.b.term.value);
      // Each step starts where the previous one ended: a list of edges that
      // does not join up is not a path.
      for (const [index, step] of path.steps.entries()) {
        if (index === 0) continue;
        expect(step.from.value).toBe(path.steps[index - 1]?.to.value);
      }
    }
  });

  it("returns SHORTEST paths only — all of one length, and that length minimal", async () => {
    const result = await ask(...CONNECTED_PAIR, { paths: 99 });
    const lengths = new Set(result.paths.map((path) => path.steps.length));
    expect(lengths.size).toBe(1);
    expect([...lengths][0]).toBe(result.hops);
    // Minimal, proved against the verb itself: one hop short of the reported
    // distance, the same question has no answer. Only askable when there IS a
    // tighter limit — a one-hop answer is minimal by construction, and the
    // limit's own floor is 1.
    const hops = result.hops ?? 0;
    expect(hops).toBeGreaterThan(0);
    if (hops > 1) {
      const tighter = await ask(...CONNECTED_PAIR, { hops: hops - 1 });
      expect(tighter.connected).toBe(false);
    }
  });

  it("returns distinct paths, in an order two runs agree on", async () => {
    const once = await ask(...CONNECTED_PAIR, { paths: 99 });
    const twice = await ask(...CONNECTED_PAIR, { paths: 99 });
    const key = (path: ConnectPath): string =>
      path.steps
        .map(
          (step) =>
            `${step.direction}:${step.predicate.value}:${step.to.value}`,
        )
        .join("|");
    const keys = once.paths.map(key);
    expect(new Set(keys).size, "duplicate paths in one answer").toBe(
      keys.length,
    );
    expect(twice.paths.map(key)).toEqual(keys);
    // Deterministic BY THE STATED KEY: hop count, then fewest distinct
    // predicates, then the path's canonical form.
    const families = once.paths.map(
      (path) => new Set(path.steps.map((step) => step.predicate.value)).size,
    );
    expect([...families]).toEqual([...families].sort((x, y) => x - y));
  });

  it("reports the hop limit and roster threshold it actually applied", async () => {
    const raised = await ask(...CONNECTED_PAIR, { hops: 6 });
    expect(raised.hopLimit).toBe(6);
    expect(raised.rosterThreshold).toBe(ROSTER_THRESHOLD);
    const tight = await ask(...CONNECTED_PAIR, { hops: 1 });
    expect(tight.hopLimit).toBe(1);
    // The limit is not decoration: a path longer than it is not returned.
    for (const path of tight.paths) {
      expect(path.steps.length).toBeLessThanOrEqual(1);
    }
  });

  it("names the packs the session it answered from was built with", async () => {
    const result = await ask(...CONNECTED_PAIR);
    expect(result.packs).toEqual(
      session.manifest.sourceRef
        .split(",")
        .map((ref) => ref.trim())
        .filter((ref) => ref.length > 0),
    );
    expect(result.packs.length).toBeGreaterThan(0);
  });

  it("answers the same path set whichever endpoint is asked first", async () => {
    const forwards = await ask(...CONNECTED_PAIR, { paths: 99 });
    const backwards = await ask(CONNECTED_PAIR[1], CONNECTED_PAIR[0], {
      paths: 99,
    });
    expect(backwards.hops).toBe(forwards.hops);
    expect(backwards.pathCount).toBe(forwards.pathCount);
    // Modulo direction: reverse the order of the steps, swap each step's ends,
    // and flip the direction it claims.
    const mirror = (result: ConnectResult): string[] =>
      result.paths
        .map((path) =>
          [...path.steps]
            .reverse()
            .map(
              (step) =>
                `${step.direction === "forward" ? "reverse" : "forward"}:${step.predicate.value}:${step.from.value}`,
            )
            .join("|"),
        )
        .sort();
    const plain = (result: ConnectResult): string[] =>
      result.paths
        .map((path) =>
          path.steps
            .map(
              (step) =>
                `${step.direction}:${step.predicate.value}:${step.to.value}`,
            )
            .join("|"),
        )
        .sort();
    expect(mirror(backwards)).toEqual(plain(forwards));
  });

  it("answers a real pair in the shape the contract promises", async () => {
    // A SHAPE assertion, not a value one: it parses, it carries at least one
    // path, and every step names a predicate and a direction — without saying
    // which predicate or which direction, because that is the graph's business
    // and the graph is about to change.
    const result = await ask(...CONNECTED_PAIR);
    const round = JSON.parse(
      connect.output.formatters.json?.(result) ?? "null",
    ) as ConnectResult;
    expect(round.connected).toBe(true);
    expect(round.paths.length).toBeGreaterThan(0);
    for (const path of round.paths) {
      expect(path.steps.length).toBeGreaterThan(0);
      for (const step of path.steps) {
        expect(step.predicate.value).toMatch(/^\w+:/);
        expect(["forward", "reverse"]).toContain(step.direction);
        expect(step.from.value.length).toBeGreaterThan(0);
        expect(step.to.value.length).toBeGreaterThan(0);
      }
    }
  });

  it("runs every documented example as WRITTEN, and each one answers", async () => {
    // The promise an example makes to a stranger. It lives here rather than in
    // `examples.exec.test.ts` because that file's cases are already the most
    // contended in the package and this one needs the same shipped store this
    // file has already booted — one store per concern, not two.
    //
    // That it ANSWERS is what is checked. An endpoint that is not in the graph
    // THROWS, which is exactly the broken example worth catching. Whether a
    // pair turns out to be connected is the graph's business and deliberately
    // not pinned: new symbols and binding records will move that, and an
    // example is not wrong for demonstrating a real answer that changed.
    expect(connect.examples?.length).toBeGreaterThan(0);
    const positionals = connect.params
      .filter((param) => param.positional)
      .map((param) => param.name);
    expect(positionals).toHaveLength(2);

    for (const [index, example] of (connect.examples ?? []).entries()) {
      // Both endpoints, read from the example's own `cmd` rather than retyped:
      // the tokens after the verb, up to the first flag.
      const endpoints: string[] = [];
      for (const token of example.cmd.trim().split(/\s+/).slice(3)) {
        if (token.startsWith("--")) break;
        endpoints.push(token);
      }
      expect(endpoints, `example ${index} names two endpoints`).toHaveLength(2);
      const result = await ask(endpoints[0] as string, endpoints[1] as string);
      // Coherent with itself, whichever answer it gave.
      expect(result.connected).toBe(result.paths.length > 0);
      expect(result.connected).toBe(result.hops !== null);
      expect(result.connected).toBe(result.unconnectedBecause === undefined);
      expect(result.packs.length).toBeGreaterThan(0);
    }
  });

  it("builds its index once per session and reuses it", async () => {
    const { relationIndex } = await import("./relationIndex.js");
    const first = await relationIndex({ session, sparql: rt.query.sparql });
    const second = await relationIndex({ session, sparql: rt.query.sparql });
    // The SAME object, not an equal one: a second scan of a 33k-edge graph per
    // question is the cost this memo exists to avoid.
    expect(second).toBe(first);
    expect(first.relationEdges).toBeGreaterThan(0);
    expect(first.relationEdges).toBeLessThan(first.scannedEdges);
    expect(first.relationNodes).toBeGreaterThan(0);
  });
});
