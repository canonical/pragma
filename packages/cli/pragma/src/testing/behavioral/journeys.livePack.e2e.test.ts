/**
 * E3 (AV-231, Backlog E) — real-oxigraph ordering, multilingual label
 * RESOLUTION and build re-entrancy, against the VENDORED default pack.
 *
 * WHAT IS ACTUALLY UNIQUE HERE. This docblock used to claim "nothing else in
 * the tree asserts any of them". That was false, and review caught it — with
 * some irony, since the argument for un-gating this file was that a suite which
 * never runs hides what it fails to do. `journeys.defaultPack.test.ts:188-210`
 * already boots {@link DEFAULT_PACK_TTL} through the real store and asserts the
 * same `ORDER BY` result, and its A7 test already asserts both raw `rdfs:label`
 * literals and that the indexed label is tag-stripped. The honest accounting:
 *
 *  - CONCURRENT `buildPack` re-entrancy — covered nowhere else.
 *  - A 20k literal surviving the build round-trip — covered nowhere else.
 *  - WHICH multilingual label the built index resolves to — pinned to the exact
 *    value here; the E1 journey only asserts the winner is one of the two
 *    declared forms.
 *  - `ORDER BY` determinism — DUPLICATED with E1 deliberately: this asserts a
 *    query repeats identically within one session, E1 asserts one evaluation
 *    through the `graph query` verb envelope. A second, differently-shaped
 *    assertion of the same behaviour is cheap; only the exclusivity claim was
 *    wrong, not the test.
 *
 * WHY THERE IS NO LONGER A GATE. This suite spent its whole life behind
 * `process.env.PRAGMA_LIVE_PACK`, whose docblock promised "a dedicated,
 * non-required CI job". That job never existed — the variable appeared in this
 * one file and nowhere else in the repo — so the suite had never executed
 * anywhere, and the first run of it found a broken fixture (the ke-truncation
 * TTL below referenced `rdfs:` without declaring the prefix, so the build threw
 * before the assertion was ever reached).
 *
 * The gate's premise was false in any case. It claimed these tests "depend on
 * the network (fetching the shipped pack) and on real build cost", but as
 * written they fetch nothing: they boot {@link DEFAULT_PACK_TTL}, an in-tree
 * string, which `journeys.defaultPack.test.ts` already boots ~20 times UNGATED
 * in the same pass. There is nothing here to be flaky, slow, or non-required
 * about, and no separate e2e runner to hang a dedicated job on — this file is
 * matched by `vitest.config.ts`'s ordinary include, exactly like its
 * ungated `.e2e.` siblings (`rootCli`, `exitCodes`, `firstRun`, `mcpServe`).
 * So it simply runs, and a regression in it turns CI red like any other.
 *
 * TODO(AV-231/E3): resolve the real shipped default pack (git/npm source) here
 * instead of the vendored TTL, so ordering/truncation are asserted against the
 * bytes agents actually receive. That is a STRENGTHENING of assertions that
 * already run — not a precondition for running them.
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readPackIndex } from "../../kernel/completion/entitySource.js";
import { buildPack } from "../../kernel/runtime/graphpack/build.js";
import { packIsComplete } from "../../kernel/runtime/graphpack/manifest.js";
import { resolveSources } from "../../kernel/runtime/resolveSources.js";
import {
  DEFAULT_PACK_PREFIXES,
  DEFAULT_PACK_TTL,
} from "../fixtures/graph/defaultPack.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";

/**
 * A source set no pack cache can already hold: the default-pack TTL under a
 * nonced path and with a nonced comment line, so its content hash is NEW on
 * every call and every run.
 *
 * The build tests are about the BUILD path, and `buildPack` short-circuits on a
 * complete cached directory. Nonced inputs make a cache hit impossible by
 * construction rather than leaving it to whatever the ambient cache happens to
 * hold — the per-file `$XDG_CACHE_HOME` isolation stays a hygiene measure, not
 * a load-bearing precondition of these assertions.
 *
 * @returns One `BuildPackInput`, unique to this call.
 * @note Impure — draws a random nonce.
 */
function freshInputs(): { path: string; content: string }[] {
  const nonce = randomUUID();
  return [
    {
      path: `concurrent/${nonce}/pack.ttl`,
      content: `# re-entrancy run ${nonce}\n${DEFAULT_PACK_TTL}`,
    },
  ];
}

describe("live-pack journey — real oxigraph ordering + build re-entrancy (E3)", () => {
  it("a SELECT ... ORDER BY returns a STABLE, deterministic ordering (A3/A9)", async () => {
    const fixture = await bootFixtureRuntime({ ttl: DEFAULT_PACK_TTL });
    try {
      const query =
        "SELECT ?name WHERE { ?c a ds:Component ; ds:name ?name } ORDER BY ?name";
      const first = await fixture.runtime.query.sparql(query);
      const second = await fixture.runtime.query.sparql(query);
      const names = (result: typeof first): string[] =>
        result.type === "select"
          ? result.bindings.map((binding) => String(binding.name))
          : [];
      // Repeated evaluation is identical, and ORDER BY is honoured.
      expect(names(first)).toEqual(names(second));
      expect(names(first)).toEqual(["Beta Badge", "Button", "Orphan Widget"]);
    } finally {
      await fixture.dispose();
    }
  });

  it("a multilingual label resolves to EXACTLY the @en value in the BUILT index (A7)", async () => {
    const fixture = await bootFixtureRuntime({ ttl: DEFAULT_PACK_TTL });
    try {
      // PRECONDITION, not the claim: both candidate literals really are in the
      // store, so the selection below has something to select BETWEEN. Asserting
      // only this (as this test once did) proves the store round-trips two
      // literals and says nothing about which one the index carries — the E1
      // journey already pins the pair.
      const raw = await fixture.runtime.query.sparql(
        "SELECT ?l WHERE { ds:button rdfs:label ?l } ORDER BY ?l",
      );
      const labels =
        raw.type === "select"
          ? raw.bindings.map((binding) => String(binding.l))
          : [];
      expect(labels).toEqual(["Bouton", "Button"]);
      // THE CLAIM: `buildIndex` carries ONE label per subject, and which one is
      // a contract, not a store-order accident — `preferredBySubject` ranks
      // untagged < `@en` < any other tag, so `"Button"@en` beats `"Bouton"@fr`
      // every time, tag-stripped. The E1 journey only asserts the winner is one
      // of the two; this is where the exact value is pinned.
      const index = await readPackIndex(
        resolveSources(await fixture.runtime.loadConfig(), fixture.cwd),
      );
      const button = index?.entities.find(
        (entity) => entity.name === "ds:button",
      );
      expect(button?.label).toBe("Button");
    } finally {
      await fixture.dispose();
    }
  });

  it("N concurrent builds of DISTINCT sources each publish their OWN complete pack (buildIndex Promise.all)", async () => {
    // `buildIndex` fans out four bulk SPARQL queries under `Promise.all`, and
    // `buildPack` writes to a temp directory it renames in atomically. This is
    // the shape that provably OVERLAPS: five distinct source sets can never
    // cache-hit one another, so all five necessarily take the build path — the
    // `reused: false` below is a guarantee, not a hope.
    const options = {
      name: "pragma",
      version: "0.0.0-e3",
      sourceRef: "e3-reentrancy",
      prefixes: DEFAULT_PACK_PREFIXES,
    };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => buildPack(freshInputs(), options)),
    );
    for (const result of results) {
      // Not a cache hit: this call ran the store, the compile and the index.
      expect(result.reused).toBe(false);
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
      // Complete: manifest plus four non-empty artifacts, so the atomic publish
      // left nothing torn behind.
      expect(packIsComplete(result.dir)).toBe(true);
      // A build that produced an EMPTY pack would satisfy every hash check.
      expect(result.manifest.tripleCount ?? 0).toBeGreaterThan(0);
    }
    // Distinct sources, distinct content-addressed directories — no clobbering.
    expect(new Set(results.map((result) => result.dir)).size).toBe(5);
  });

  it("N concurrent builds of IDENTICAL sources converge on ONE complete pack, built at least once", async () => {
    // TWO THINGS THIS TEST HAS TO EARN, both of which an earlier version faked.
    //
    // 1. IT MUST ACTUALLY BUILD. `buildPack` returns at its top for a hash whose
    //    directory is already complete (build.ts's `packIsComplete`
    //    short-circuit), so fixed inputs can decay into pure cache hits that
    //    exercise nothing. `setupXdgIsolation.ts` gives every test FILE a fresh
    //    `$XDG_CACHE_HOME`, so the cache does not survive a run today — but the
    //    test must not DEPEND on ambient isolation for its meaning. A nonce in
    //    the sources makes the content hash new on every run, so a stale hit is
    //    impossible by construction, and `reused: false` is then ASSERTED.
    // 2. THE ASSERTION MUST BE FALSIFIABLE. Comparing the five content hashes
    //    proves nothing: the hash is computed FROM the inputs before any work
    //    happens, so identical inputs give identical hashes even if every build
    //    produced nothing at all. What concurrency actually risks is a TORN or
    //    clobbered directory, so that is what is checked — `packIsComplete` on
    //    the converged directory, a non-empty triple count, and a reuse after.
    //
    // HOW MANY of the five build is deliberately NOT pinned. The pack build is
    // synchronous WASM work that blocks the event loop, so whether the other
    // four get past their cache check before the winner publishes depends on
    // whether the store module is already warm: cold, all five build; warm, one
    // builds and four reuse. Both are correct, and both must converge here.
    const inputs = freshInputs();
    const options = {
      name: "pragma",
      version: "0.0.0-e3",
      sourceRef: "e3-reentrancy",
      prefixes: DEFAULT_PACK_PREFIXES,
    };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => buildPack(inputs, options)),
    );
    // The build path RAN — these are not five no-op cache hits.
    expect(results.some((result) => !result.reused)).toBe(true);
    // One directory, and it is complete: reusers were handed a whole pack, not
    // a half-written one.
    const dirs = new Set(results.map((result) => result.dir));
    expect(dirs.size).toBe(1);
    const dir = results[0]?.dir ?? "";
    expect(packIsComplete(dir)).toBe(true);
    for (const result of results) {
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.manifest.tripleCount ?? 0).toBeGreaterThan(0);
    }
    // The published pack is genuinely REUSABLE, which is also what proves
    // `reused` is a real distinction above rather than a constant `false`.
    const after = await buildPack(inputs, options);
    expect(after.reused).toBe(true);
    expect(after.dir).toBe(dir);
    expect(after.contentHash).toBe(results[0]?.contentHash);
  });

  it("a long literal survives the build round-trip without silent ke truncation", async () => {
    // TODO(AV-231/E3): confirm against the live pack, whose real summaries/guidelines
    // are long enough to trip any downstream ke truncation (A7/A9 tail).
    const longText = "x".repeat(20_000);
    // `rdfs:` MUST be declared: the property below is typed with
    // `rdfs:range`, and an undeclared prefix makes oxigraph reject the whole
    // document at parse time — which is what this fixture did, unnoticed, for
    // as long as the gate kept the suite from ever running.
    const ttl = `@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ds:Component a owl:Class .
ds:summary a owl:DatatypeProperty ; rdfs:range xsd:string .
ds:big a ds:Component ; ds:summary "${longText}" .`;
    let fixture: FixtureGraph | undefined;
    try {
      fixture = await bootFixtureRuntime({ ttl });
      const result = await fixture.runtime.query.sparql(
        "SELECT ?s WHERE { ds:big ds:summary ?s }",
      );
      const value =
        result.type === "select"
          ? String(
              (result.bindings.at(0) as { s?: string } | undefined)?.s ?? "",
            )
          : "";
      expect(value.length).toBe(longText.length);
    } finally {
      await fixture?.dispose();
    }
  });
});
