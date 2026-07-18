import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emitSurface } from "../kernel/spec/emitSurface.js";
import {
  assertConforms,
  type Covenant,
} from "../kernel/spec/surfaceConformance.js";
import { capabilities } from "./index.js";

/** The committed covenant, read from disk exactly as a consumer would. */
const golden = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../surface/surface.v2.json", import.meta.url)),
    "utf-8",
  ),
) as Covenant;

describe("surface conformance — capabilities ⊆ covenant (PROTECTED)", () => {
  const emitted = emitSurface(capabilities);

  it("the live capabilities conform to the frozen covenant", () => {
    expect(() => assertConforms(emitted, golden)).not.toThrow();
  });

  it("keeps config_show unchanged from PR1", () => {
    expect(emitted.nouns.config?.verbs).toEqual([
      { v: "show", mcp: "config_show" },
    ]);
    expect(emitted.nouns.info?.verbs).toEqual([{ v: "info", mcp: "info" }]);
    // Hidden meta verbs (__complete, mcp) are excluded from the surface.
    expect(emitted.nouns.mcp).toBeUndefined();
    expect(emitted.nouns.__complete).toBeUndefined();
  });

  it("emits the read nouns/verbs the packs add (block list hand-written, sample only where declared)", () => {
    expect(emitted.nouns.standard?.verbs.map((v) => v.v)).toEqual([
      "list",
      "categories",
      "lookup",
      "sample",
    ]);
    // tier is list-only; modifier/token add lookup but no sample; block is
    // list (hand-written, --all-tiers) + graphql lookup.
    expect(emitted.nouns.tier?.verbs.map((v) => v.v)).toEqual(["list"]);
    expect(emitted.nouns.modifier?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
    ]);
    expect(emitted.nouns.token?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
    ]);
    expect(emitted.nouns.block?.verbs).toEqual([
      {
        v: "list",
        flags: ["--all-tiers"],
        needsStore: true,
        mcp: "block_list",
      },
      {
        v: "lookup",
        args: ["<name...>"],
        needsStore: true,
        mcp: "block_lookup",
      },
    ]);
  });

  it("emits the authored read nouns (ontology TBox, storeless skill, graph inspect)", () => {
    expect(emitted.nouns.ontology?.verbs).toEqual([
      { v: "list", needsStore: true, mcp: "ontology_list" },
      {
        v: "show",
        args: ["<prefix>"],
        flags: ["--properties", "--full-uris", "--class"],
        needsStore: true,
        mcp: "ontology_show",
      },
    ]);
    // skill discovery is storeless (filesystem) — no needsStore.
    expect(emitted.nouns.skill?.verbs).toEqual([
      { v: "list", mcp: "skill_list" },
      { v: "lookup", args: ["<name>"], mcp: "skill_lookup" },
    ]);
    // graph ships only inspect in PR3 (query lands in PR6).
    expect(emitted.nouns.graph?.verbs).toEqual([
      {
        v: "inspect",
        args: ["<uri>"],
        needsStore: true,
        mcp: "graph_inspect",
      },
    ]);
  });

  it("emits sorted tools, every one blessed by the covenant", () => {
    const { tools } = emitted.mcpSurface;
    expect(tools).toEqual([...tools].sort());
    for (const tool of tools) {
      expect(golden.mcpSurface.tools).toContain(tool);
    }
    // The ratified read tool names are load-bearing (lookup, NOT get).
    for (const tool of [
      "standard_lookup",
      "block_lookup",
      "modifier_lookup",
      "token_lookup",
      "standard_categories",
      "standard_sample",
      "tier_list",
      "config_show",
    ]) {
      expect(tools).toContain(tool);
    }
  });
});
