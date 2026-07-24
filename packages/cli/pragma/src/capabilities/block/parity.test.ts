/**
 * Block content-parity (PROTECTED) — on a FIXTURE graph, not the live one.
 *
 * The hand-written block lookup is gone; parity is asserted against the fixture
 * graph directly: Button and Modal resolve through the GraphQL `block lookup`
 * with the same content a direct SPARQL oracle returns (summary, guidance,
 * anatomy, tier, modifier families with values, properties, subcomponents). The
 * fixture DECLARES whenToUse/whenNotToUse (which the live graph superseded with
 * ds:usage), so those sections are exercised here. The hand-written `block list`
 * is checked for its tier/channel filtering and --all-tiers.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LookupOutput } from "../../kernel/packs/resolveEntity.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  BLOCK_PREFIXES,
  BLOCK_TTL,
} from "../../testing/fixtures/blockGraph.js";
import { buildFixtureRuntime } from "../../testing/helpers/packRuntime.js";
import type { BlockRow } from "./blockList.verb.js";
import { blockModule } from "./index.js";

const DS = "https://ds.canonical.com/";

const listVerb = blockModule.verbs.find(
  (v) => verbKey(v.path) === "block list",
) as VerbSpec;
const lookupVerb = blockModule.verbs.find(
  (v) => verbKey(v.path) === "block lookup",
) as VerbSpec;

let rt: PragmaRuntime;

beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({
    ttl: BLOCK_TTL,
    prefixes: BLOCK_PREFIXES,
    detail: "detailed",
  }));
});

afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

async function lookup(name: string): Promise<Record<string, unknown>> {
  const out = (await lookupVerb.run({ name: [name] }, rt)) as LookupOutput;
  expect(out.errors).toEqual([]);
  return out.results.at(0) as Record<string, unknown>;
}

/** Oracle: a single scalar from the graph, queried directly. */
async function oracle(subject: string, predicate: string): Promise<string> {
  const result = await rt.query.sparql(
    `SELECT ?v WHERE { <${subject}> ${predicate} ?v }`,
  );
  return result.type === "select" ? (result.bindings[0]?.v ?? "") : "";
}

describe("block lookup — Button content parity (GraphQL, detailed)", () => {
  it("resolves the full Button spec with content matching the SPARQL oracle", async () => {
    const button = await lookup("Button");
    expect(button.uri).toBe(`${DS}button`);
    expect(button.name).toBe("Button");
    expect(button.tier).toBe(`${DS}global`);

    // Guidance + anatomy sections — each cross-checked against the graph.
    expect(button.summary).toBe(await oracle(`${DS}button`, "ds:summary"));
    expect(button.whenToUse).toBe(await oracle(`${DS}button`, "ds:whenToUse"));
    expect(button.whenNotToUse).toBe(
      await oracle(`${DS}button`, "ds:whenNotToUse"),
    );
    expect(button.guidelines).toBe(
      await oracle(`${DS}button`, "ds:guidelines"),
    );
    expect(button.anatomyDsl).toBe(
      await oracle(`${DS}button`, "ds:anatomyDsl"),
    );
    expect(button.figmaLink).toBe(await oracle(`${DS}button`, "ds:figmaLink"));
  });

  it("resolves the nested modifier families with values (inverse union)", async () => {
    const button = await lookup("Button");
    const families = button.modifierFamilies as {
      name: string;
      values?: string[];
    }[];
    expect(families.map((f) => f.name).sort()).toEqual([
      "density",
      "importance",
    ]);
    const importance = families.find((f) => f.name === "importance");
    expect(importance?.values?.sort()).toEqual(["primary", "secondary"]);
  });

  it("resolves properties and the subtype-scoped subcomponents identity field", async () => {
    const button = await lookup("Button");
    expect(button.properties).toEqual([
      { name: "disabled", type: "boolean", optional: "true" },
    ]);
    expect(button.subcomponents).toEqual([
      { name: "Button Icon", uri: `${DS}button.icon` },
    ]);
  });

  it("renders every declared section in the llm output", async () => {
    const out = (await lookupVerb.run(
      { name: ["Button"] },
      rt,
    )) as LookupOutput;
    const llm = lookupVerb.output.formatters.llm(out);
    expect(llm).toContain("## Button");
    expect(llm).toContain("### When to use");
    expect(llm).toContain("### Anatomy (DSL)");
    expect(llm).toContain("### Modifier Families");
    expect(llm).toContain("primary");
  });
});

describe("block lookup — Modal content parity (GraphQL, detailed)", () => {
  it("resolves the full Modal spec (a different block, same document engine)", async () => {
    const modal = await lookup("Modal");
    expect(modal.uri).toBe(`${DS}modal`);
    expect(modal.name).toBe("Modal");
    expect(modal.summary).toBe(await oracle(`${DS}modal`, "ds:summary"));
    expect(modal.whenToUse).toBe(await oracle(`${DS}modal`, "ds:whenToUse"));
    const families = modal.modifierFamilies as {
      name: string;
      values?: string[];
    }[];
    expect(families.map((f) => f.name)).toEqual(["size"]);
    expect(families[0]?.values?.sort()).toEqual(["large", "small"]);
    expect(modal.properties).toEqual([
      { name: "open", type: "boolean", optional: "false" },
    ]);
    // Modal has no subcomponents — the subtype-scoped selection is simply absent.
    expect(modal.subcomponents).toEqual([]);
  });
});

describe("block lookup — disclosure trims to the base view at summary", () => {
  it("summary keeps name/tier/summary and drops the detailed sections/expands", async () => {
    const out = (await lookupVerb.run(
      { name: ["Button"] },
      { ...rt, globalFlags: { ...rt.globalFlags, detail: "summary" } },
    )) as LookupOutput;
    const button = out.results.at(0) as Record<string, unknown>;
    expect(button.name).toBe("Button");
    expect(button.summary).toBeDefined();
    expect(button.whenToUse).toBeUndefined();
    expect(button.anatomyDsl).toBeUndefined();
    expect(button.modifierFamilies).toBeUndefined();
    expect(button.figmaLink).toBeUndefined();
  });
});

describe("block list — hand-written tier/channel filtering", () => {
  it("lists visible blocks with the summary row shape", async () => {
    const rows = (await listVerb.run({}, rt)) as BlockRow[];
    const byName = new Map(rows.map((r) => [r.name, r]));
    expect([...byName.keys()].sort()).toEqual(["Button", "Modal"]);
    const button = byName.get("Button");
    expect(button?.type).toBe("component");
    expect(button?.tier).toBe("global");
    expect(button?.uri).toBe(`${DS}button`);
    // GROUP_CONCAT of the family names (order-independent).
    expect(button?.modifiers.split(", ").sort()).toEqual([
      "density",
      "importance",
    ]);
  });

  it("--all-tiers also reveals the untiered subcomponent (A2)", async () => {
    // Button Icon is a ds:Subcomponent with NO ds:tier: the scoped/default view
    // omits it (a block joins the list through its tier), but --all-tiers must
    // surface every block, including untiered ones.
    const rows = (await listVerb.run({ allTiers: true }, rt)) as BlockRow[];
    expect(rows.map((r) => r.name).sort()).toEqual([
      "Button",
      "Button Icon",
      "Modal",
    ]);
  });
});
