/**
 * The bundled `concept` pack — list + lookup over `ds:Concept` (standalone
 * documentation), exercised against a real fixture graph through the MCP
 * projection (the same path the CLI dispatches).
 *
 * Proves the SPARQL list surfaces name/type/tier, the SPARQL lookup renders the
 * Markdown `ds:content` body as a code section plus summary/type/tier, and an
 * unknown name errors with the entity-not-found recovery.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../../testing/helpers/fixtureGraph.js";
import type { McpHarness } from "../../testing/helpers/projectMcp.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { capabilities } from "../index.js";

/** A minimal graph: two concepts (one with a content body), a type, a tier. */
const CONCEPT_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ds:Concept a rdfs:Class .
ds:ConceptType a rdfs:Class .
ds:Tier a rdfs:Class .

ds:global a ds:Tier ; ds:name "global" .
ds:concepttype.Explanation a ds:ConceptType ; ds:name "Explanation" .

ds:concept.Foundations-Grid a ds:Concept ;
    ds:name "Foundations: Grid" ;
    ds:summary "The shared column system and per-tier grid rules." ;
    ds:content "## Grid\\n\\nColumn counts are 4, 8, or 16 only." ;
    ds:conceptType ds:concepttype.Explanation ;
    ds:tier ds:global .

ds:concept.Intentional-friction a ds:Concept ;
    ds:name "Intentional friction" ;
    ds:tier ds:global .
`;

let fixture: FixtureGraph;
let mcp: McpHarness;

beforeAll(async () => {
  fixture = await bootFixtureRuntime({ ttl: CONCEPT_TTL });
  mcp = await projectMcp(capabilities, fixture.cwd);
});

afterAll(async () => {
  await mcp.cleanup();
  await fixture.dispose();
});

describe("concept_list", () => {
  it("lists every concept with its name, type, and tier", async () => {
    const result = await mcp.callTool("concept_list", {});
    expect(result.ok).toBe(true);
    const rows = result.data as {
      name: string;
      type?: string;
      tier?: string;
    }[];
    const names = rows.map((r) => r.name);
    expect(names).toContain("Foundations: Grid");
    expect(names).toContain("Intentional friction");
    const grid = rows.find((r) => r.name === "Foundations: Grid");
    expect(grid?.type).toBe("Explanation");
    expect(grid?.tier).toBe("global");
  });
});

describe("concept_lookup", () => {
  it("returns the full Markdown content body plus summary/type/tier", async () => {
    const result = await mcp.callTool("concept_lookup", {
      name: ["Foundations: Grid"],
    });
    expect(result.ok).toBe(true);
    const data = JSON.stringify(result.data);
    expect(data).toContain("Column counts are 4, 8, or 16 only.");
    expect(data).toContain("The shared column system");
    expect(data).toContain("Explanation");
  });

  // The unknown-name miss (ENTITY_NOT_FOUND) is covered uniformly for every
  // lookup noun by the parameterized errorMatrix.mcp.test.ts — a colon-bearing
  // name is the concept-specific wrinkle, guarded above.
});
