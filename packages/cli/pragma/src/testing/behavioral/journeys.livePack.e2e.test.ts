/**
 * E3 (AV-231, Backlog E) — the network-gated, NON-BLOCKING live-pack job.
 *
 * A handful of behaviours can only be confirmed against a REAL oxigraph store
 * built from the REAL default pack: result ordering (A3/A9), which language a
 * multilingual label resolves to under real store order (A7), ke truncation of
 * long literals, and `buildIndex`'s `Promise.all` re-entrancy when the same pack
 * is built concurrently. Those depend on the network (fetching the shipped pack)
 * and on real build cost, so this suite is GATED OFF by default — it never runs
 * (or flakes) in the ordinary `bun test` pass. Set `PRAGMA_LIVE_PACK=1` to run
 * it (a dedicated, non-required CI job).
 *
 * The assertions here run against the VENDORED default pack as a faithful local
 * proxy for the shipped one, so a maintainer who flips the gate gets real signal
 * today. Each carries a TODO for wiring the ACTUAL network pack fetch — the one
 * piece this environment cannot provide.
 *
 * TODO(AV-231/E3): resolve the real shipped default pack (git/npm source) here
 * instead of the vendored TTL, so ordering/truncation are asserted against the
 * bytes agents actually receive.
 */

import { describe, expect, it } from "vitest";
import { buildPack } from "../../kernel/runtime/graphpack/build.js";
import {
  DEFAULT_PACK_PREFIXES,
  DEFAULT_PACK_TTL,
} from "../fixtures/graph/defaultPack.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";

/** Non-blocking gate: skipped unless a maintainer opts in (or CI's live job). */
const liveGate = process.env.PRAGMA_LIVE_PACK ? describe : describe.skip;

liveGate(
  "live-pack journey — real oxigraph ordering + build re-entrancy (E3)",
  () => {
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

    it("a multilingual label resolves to a SINGLE, tag-stripped value under real store order (A7)", async () => {
      // TODO(AV-231/E3): against the live pack, pin the EXACT language the store
      // yields first, so the index-label choice is a confirmed contract rather than
      // the store-order accident it is today (see the A7 note in the E1 journey).
      const fixture = await bootFixtureRuntime({ ttl: DEFAULT_PACK_TTL });
      try {
        const result = await fixture.runtime.query.sparql(
          "SELECT ?l WHERE { ds:button rdfs:label ?l } ORDER BY ?l",
        );
        const labels =
          result.type === "select"
            ? result.bindings.map((binding) => String(binding.l))
            : [];
        expect(labels).toEqual(["Bouton", "Button"]);
      } finally {
        await fixture.dispose();
      }
    });

    it("building the same sources CONCURRENTLY is re-entrant — one hash, no torn pack (buildIndex Promise.all)", async () => {
      // buildIndex fans out four bulk SPARQL queries under Promise.all, and buildPack
      // publishes atomically; N concurrent builds of identical sources must converge
      // on ONE content hash with every pack complete (no half-written cache).
      const inputs = [
        { path: "concurrent/pack.ttl", content: DEFAULT_PACK_TTL },
      ];
      const options = {
        name: "pragma",
        version: "0.0.0-e3",
        sourceRef: "e3-reentrancy",
        prefixes: DEFAULT_PACK_PREFIXES,
      };
      const results = await Promise.all(
        Array.from({ length: 5 }, () => buildPack(inputs, options)),
      );
      const hashes = new Set(results.map((result) => result.contentHash));
      expect(hashes.size).toBe(1);
      for (const result of results) {
        expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it("a long literal survives the build round-trip without silent ke truncation", async () => {
      // TODO(AV-231/E3): confirm against the live pack, whose real summaries/guidelines
      // are long enough to trip any downstream ke truncation (A7/A9 tail).
      const longText = "x".repeat(20_000);
      const ttl = `@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
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
  },
);
