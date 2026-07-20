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
import type { OntologyShowData, OntologySummary } from "./queries.js";

const listVerb = ontologyModule.verbs.find(
  (v) => verbKey(v.path) === "ontology list",
) as VerbSpec;
const showVerb = ontologyModule.verbs.find(
  (v) => verbKey(v.path) === "ontology show",
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

describe("ontology show", () => {
  it("renders the class hierarchy with per-class instance counts from the index", async () => {
    const data = (await showVerb.run({ prefix: "ds" }, rt)) as OntologyShowData;
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
    const data = (await showVerb.run(
      { prefix: "ds" },
      detailed,
    )) as OntologyShowData;
    expect(data.properties.length).toBeGreaterThan(0);
  });

  it("--detail summary keeps classes only (no properties)", async () => {
    const summary = {
      ...rt,
      globalFlags: { ...rt.globalFlags, detail: "summary" as const },
    };
    const data = (await showVerb.run(
      { prefix: "ds" },
      summary,
    )) as OntologyShowData;
    expect(data.properties).toEqual([]);
  });

  it("--class focuses on one class and its properties", async () => {
    const data = (await showVerb.run(
      { prefix: "ds", class: "BlockProperty" },
      rt,
    )) as OntologyShowData;
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
    const data = (await showVerb.run(
      { prefix: "ds", fullUris: true },
      rt,
    )) as OntologyShowData;
    expect(data.fullUris).toBe(true);
    const llm = showVerb.output.formatters.llm(data);
    expect(llm).toContain("https://ds.canonical.com/Component");
  });

  it("rejects an unknown prefix with recovery", async () => {
    await expect(showVerb.run({ prefix: "nope" }, rt)).rejects.toThrow(
      /prefix/i,
    );
  });
});

describe("ontology_show honours detail over MCP (B5)", () => {
  // The CLI B5 cases above seed `globalFlags.detail` and call `showVerb.run`
  // directly. Over MCP there are NO global flags — the ONLY detail channel is
  // the per-tool `detail` param the projector injects from the VerbSpec
  // disclosure. Under an AMBIENT config `detail: standard`, an `ontology_show`
  // with no declared disclosure would force the properties section with no
  // per-call escape (the AV-228 MCP-opt-out asymmetry `block`/`standard` lack);
  // declaring disclosure lights the param up, so an agent can ask for
  // classes-only per call and can equally override upward.
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

  it("injects a detail param onto the ontology_show tool (symmetric with block/standard)", async () => {
    const tools = await mcp.listTools();
    const show = tools.find((t) => t.name === "ontology_show");
    const schema = show?.inputSchema as {
      properties?: Record<string, unknown>;
    };
    expect(schema.properties?.detail).toBeDefined();
  });

  it("honours the ambient detail=standard config when no per-call detail is set", async () => {
    // Proves the ambient level really is standard, so the summary case below is
    // a genuine per-call override rather than merely the spec default.
    const result = await mcp.callTool("ontology_show", { prefix: "ds" });
    expect(result.ok).toBe(true);
    const data = result.data as { properties: unknown[] };
    expect(data.properties.length).toBeGreaterThan(0);
  });

  it("a per-call detail=summary returns classes-only despite the ambient standard", async () => {
    const result = await mcp.callTool("ontology_show", {
      prefix: "ds",
      detail: "summary",
    });
    expect(result.ok).toBe(true);
    const data = result.data as { classes: unknown[]; properties: unknown[] };
    expect(data.classes.length).toBeGreaterThan(0);
    expect(data.properties).toEqual([]);
  });

  it("an explicit detail=detailed overrides upward to include properties", async () => {
    const result = await mcp.callTool("ontology_show", {
      prefix: "ds",
      detail: "detailed",
    });
    expect(result.ok).toBe(true);
    const data = result.data as { properties: unknown[] };
    expect(data.properties.length).toBeGreaterThan(0);
  });
});
