/**
 * Ontology inspection (list + show) over the block fixture graph.
 *
 * Asserts the TBox exception: namespaces are grouped with class/property counts,
 * a namespace's class hierarchy carries per-class instance counts from the pack
 * index, `--class` focuses, `--properties` includes properties, and `--full-uris`
 * shows absolute IRIs.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  BLOCK_PREFIXES,
  BLOCK_TTL,
} from "../../testing/fixtures/blockGraph.js";
import { CANONICAL_TTL } from "../../testing/fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../../testing/helpers/fixtureGraph.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { capabilities } from "../index.js";
import { ontologyModule } from "./index.js";
import type { OntologyLookupData, OntologySummary } from "./queries.js";

const listVerb = ontologyModule.verbs.find(
  (v) => verbKey(v.path) === "ontology list",
) as VerbSpec;
const lookupVerb = ontologyModule.verbs.find(
  (v) => verbKey(v.path) === "ontology lookup",
) as VerbSpec;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({
    ttl: BLOCK_TTL,
    prefixes: BLOCK_PREFIXES,
  }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

describe("ontology list", () => {
  it("groups the ds namespace with class and property counts", async () => {
    const rows = (await listVerb.run({}, rt)) as OntologySummary[];
    const ds = rows.find((r) => r.prefix === "ds");
    expect(ds).toBeDefined();
    expect(ds?.namespace).toBe("https://ds.canonical.com/");
    expect(ds?.classCount).toBeGreaterThan(0);
    expect(ds?.propertyCount).toBeGreaterThan(0);
  });
});

describe("ontology lookup (primary by-name read)", () => {
  it("renders the class hierarchy with per-class instance counts from the index", async () => {
    const data = (await lookupVerb.run(
      { prefix: "ds" },
      rt,
    )) as OntologyLookupData;
    const component = data.classes.find((c) => c.uri.endsWith("Component"));
    expect(component?.superclass).toBe("https://ds.canonical.com/UIBlock");
    // Two Component individuals (Button, Modal) in the fixture.
    expect(component?.instanceCount).toBe(2);
    expect(data.properties).toEqual([]);
  });

  it("--detail detailed folds onto disclosure and includes properties (B5)", async () => {
    // Ontology honours the canonical `--detail` instead of only its bespoke
    // `--properties`: standard/detailed add the properties section.
    const detailed = {
      ...rt,
      globalFlags: { ...rt.globalFlags, detail: "detailed" as const },
    };
    const data = (await lookupVerb.run(
      { prefix: "ds" },
      detailed,
    )) as OntologyLookupData;
    expect(data.properties.length).toBeGreaterThan(0);
  });

  it("--detail summary keeps classes only (no properties)", async () => {
    const summary = {
      ...rt,
      globalFlags: { ...rt.globalFlags, detail: "summary" as const },
    };
    const data = (await lookupVerb.run(
      { prefix: "ds" },
      summary,
    )) as OntologyLookupData;
    expect(data.properties).toEqual([]);
  });

  it("--class focuses on one class and its properties", async () => {
    const data = (await lookupVerb.run(
      { prefix: "ds", class: "BlockProperty" },
      rt,
    )) as OntologyLookupData;
    expect(data.classes.map((c) => c.uri.split(/[#/]/).pop())).toEqual([
      "BlockProperty",
    ]);
    // The focus pulls in properties whose domain is BlockProperty.
    expect(
      data.properties.every(
        (p) => p.domain === "https://ds.canonical.com/BlockProperty",
      ),
    ).toBe(true);
    expect(data.properties.length).toBeGreaterThan(0);
    expect(data.focus).toBe("BlockProperty");
  });

  it("--full-uris flag rides on the payload for the renderer", async () => {
    const data = (await lookupVerb.run(
      { prefix: "ds", fullUris: true },
      rt,
    )) as OntologyLookupData;
    expect(data.fullUris).toBe(true);
    const llm = lookupVerb.output.formatters.llm(data);
    expect(llm).toContain("https://ds.canonical.com/Component");
  });

  it("rejects an unknown prefix with recovery", async () => {
    await expect(lookupVerb.run({ prefix: "nope" }, rt)).rejects.toThrow(
      /prefix/i,
    );
  });
});

describe("ontology_lookup honours detail over MCP (B5)", () => {
  // The CLI B5 cases above seed `globalFlags.detail` and call `lookupVerb.run`
  // directly. Over MCP there are NO global flags — the ONLY detail channel is
  // the per-tool `detail` param the projector injects from the VerbSpec
  // disclosure. Under an AMBIENT config `detail: standard`, an `ontology_lookup`
  // with no declared disclosure would force the properties section with no
  // per-call escape (the AV-228 MCP-opt-out asymmetry `block`/`standard` lack);
  // declaring disclosure lights the param up, so an agent can ask for
  // classes-only per call and can equally override upward.
  //
  // These cases were written against `ontology_show`, the deprecated alias, and
  // were RETARGETED rather than deleted when it was removed — they are the only
  // coverage of detail injection over MCP for this noun. Two of the six were
  // dropped as exact duplicates of their `ontology_lookup` twins once
  // retargeted (param injection, and the per-call summary override); the four
  // that remain each assert something no other case does.
  let fixture: FixtureGraph;
  let mcp: Awaited<ReturnType<typeof projectMcp>>;

  beforeAll(async () => {
    // Ambient config detail=standard → origins.detail === "project", so it
    // outranks the verb's `summary` default inside resolvePackDetail.
    fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: { detail: "standard" },
    });
    mcp = await projectMcp(capabilities, fixture.cwd);
  });

  afterAll(async () => {
    await mcp.cleanup();
    await fixture.dispose();
  });

  it("exposes the primary ontology_lookup tool with the same injected detail param (AV-228 B1)", async () => {
    const tools = await mcp.listTools();
    const lookup = tools.find((t) => t.name === "ontology_lookup");
    expect(lookup).toBeDefined();
    const schema = lookup?.inputSchema as {
      properties?: Record<string, unknown>;
    };
    expect(schema.properties?.detail).toBeDefined();
  });

  it("ontology_lookup honours a per-call detail=summary despite the ambient standard", async () => {
    const result = await mcp.callTool("ontology_lookup", {
      prefix: "ds",
      detail: "summary",
    });
    expect(result.ok).toBe(true);
    const data = result.data as { classes: unknown[]; properties: unknown[] };
    expect(data.classes.length).toBeGreaterThan(0);
    expect(data.properties).toEqual([]);
  });

  it("honours the ambient detail=standard config when no per-call detail is set", async () => {
    // Proves the ambient level really is standard, so the summary case below is
    // a genuine per-call override rather than merely the spec default.
    const result = await mcp.callTool("ontology_lookup", { prefix: "ds" });
    expect(result.ok).toBe(true);
    const data = result.data as { properties: unknown[] };
    expect(data.properties.length).toBeGreaterThan(0);
  });

  it("an explicit detail=detailed overrides upward to include properties", async () => {
    const result = await mcp.callTool("ontology_lookup", {
      prefix: "ds",
      detail: "detailed",
    });
    expect(result.ok).toBe(true);
    const data = result.data as { properties: unknown[] };
    expect(data.properties.length).toBeGreaterThan(0);
  });
});
