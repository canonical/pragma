/**
 * `graph query` — the raw SPARQL escape hatch over the canonical fixture graph.
 *
 * Exercises SELECT / ASK / CONSTRUCT with deterministic results (4 canonical
 * `ds:Component`s, COUNT=4), the syntax-error → INVALID_INPUT + `ontology_list`
 * recovery, the `needsStore` boot, and CLI-json ≡ MCP `graph_query` parity.
 * Closes the PARITY_GAP `graph-query-deferred`.
 */

import type { QueryResult } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_TTL,
} from "../../testing/fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../../testing/helpers/fixtureGraph.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { graphModule } from "./index.js";

const NO_MUT = { dryRun: false, undo: false, yes: false };
const FLAGS_JSON: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};

const queryVerb = graphModule.verbs.find(
  (v) => v.path[1] === "query",
) as VerbSpec;

let fixture: FixtureGraph;
beforeAll(async () => {
  fixture = await bootFixtureRuntime({
    ttl: CANONICAL_TTL,
    config: ALL_VISIBLE_CONFIG,
  });
});
afterAll(async () => {
  await fixture.dispose();
});

describe("graph query — SELECT / ASK / CONSTRUCT", () => {
  it("SELECT resolves the 4 canonical components, ordered by name", async () => {
    const result = (await queryVerb.run(
      {
        sparql:
          "SELECT ?name WHERE { ?c a ds:Component ; ds:name ?name } ORDER BY ?name",
      },
      fixture.runtime,
    )) as QueryResult;
    expect(result.type).toBe("select");
    const names =
      result.type === "select" ? result.bindings.map((b) => b.name) : [];
    expect(names).toEqual(["Beta Widget", "Button", "LXD Panel", "Modal"]);
  });

  it("SELECT COUNT(*) over ds:Component is 4", async () => {
    const result = (await queryVerb.run(
      { sparql: "SELECT (COUNT(*) AS ?c) WHERE { ?comp a ds:Component }" },
      fixture.runtime,
    )) as QueryResult;
    const count =
      result.type === "select" ? Number(result.bindings[0]?.c ?? 0) : 0;
    expect(count).toBe(4);
  });

  it("ASK returns a boolean", async () => {
    const yes = (await queryVerb.run(
      { sparql: "ASK { ?c a ds:Component }" },
      fixture.runtime,
    )) as QueryResult;
    expect(yes).toMatchObject({ type: "ask", result: true });

    const no = (await queryVerb.run(
      { sparql: "ASK { ds:nonesuch a ds:Component }" },
      fixture.runtime,
    )) as QueryResult;
    expect(no).toMatchObject({ type: "ask", result: false });
  });

  it("CONSTRUCT returns triples", async () => {
    const result = (await queryVerb.run(
      {
        sparql: "CONSTRUCT { ?c a ds:Component } WHERE { ?c a ds:Component }",
      },
      fixture.runtime,
    )) as QueryResult;
    expect(result.type).toBe("construct");
    const triples = result.type === "construct" ? result.triples : [];
    expect(triples).toHaveLength(4);
  });
});

describe("graph query — errors & boot", () => {
  it("a syntax error is INVALID_INPUT with an ontology_list recovery", async () => {
    let caught: unknown;
    try {
      await queryVerb.run(
        { sparql: "SELECT ?x WHERE { this is not valid sparql" },
        fixture.runtime,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "INVALID_INPUT" });
    expect(
      (caught as { recovery?: { mcp?: { tool: string } } }).recovery?.mcp,
    ).toMatchObject({ tool: "ontology_list" });
  });

  it("needsStore boots the store before the query runs", async () => {
    const fresh = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: ALL_VISIBLE_CONFIG,
    });
    expect(fresh.runtime.store.booted).toBe(false);
    const outcome = await executeVerb(
      queryVerb,
      { sparql: "SELECT (COUNT(*) AS ?c) WHERE { ?comp a ds:Component }" },
      NO_MUT,
      fresh.runtime,
    );
    expect(outcome.exitCode).toBe(0);
    expect(fresh.runtime.store.booted).toBe(true);
    await fresh.dispose();
  });
});

describe("graph query — CLI-json ≡ MCP graph_query (PROTECTED)", () => {
  it("both surfaces return the same envelope over the same graph", async () => {
    const sparql =
      "SELECT ?name WHERE { ?c a ds:Component ; ds:name ?name } ORDER BY ?name";
    const cli = await executeVerb(
      queryVerb,
      { sparql },
      NO_MUT,
      bootRuntime(FLAGS_JSON, fixture.cwd),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string);

    const mcp = await projectMcp([graphModule], fixture.cwd);
    const mcpEnvelope = await mcp.callTool("graph_query", { sparql });
    await mcp.cleanup();

    expect(cliEnvelope).toEqual(mcpEnvelope);
    expect(cliEnvelope.ok).toBe(true);
  });
});
