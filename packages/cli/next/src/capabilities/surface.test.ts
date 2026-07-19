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

  it("emits config show + the PR6 setters + the PR9 additive set, in covenant order", () => {
    expect(emitted.nouns.config?.verbs).toEqual([
      { v: "show", mcp: "config_show" },
      { v: "tier", args: ["<path>"], mutates: true, mcp: "config_tier" },
      { v: "channel", args: ["<name>"], mutates: true, mcp: "config_channel" },
      { v: "detail", args: ["<level>"], mutates: true, mcp: "config_detail" },
      {
        v: "set",
        args: ["<key>", "<value>"],
        mutates: true,
        mcp: "config_set",
      },
    ]);
    // info stays a data-only enrichment — its emitted verb is unchanged.
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
    // PR7 completes the surface: tier gains a bespoke single-name lookup;
    // block/modifier/token gain no-argument samples (fixedCount).
    expect(emitted.nouns.tier?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
    ]);
    expect(emitted.nouns.modifier?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
      "sample",
    ]);
    expect(emitted.nouns.token?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
      "sample",
      "add-config",
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
      { v: "sample", needsStore: true, mcp: "block_sample" },
    ]);
    // The bespoke tier lookup emits the SINGLE-name positional the covenant
    // freezes (a pack lookup would emit the variadic `<name...>`).
    expect(emitted.nouns.tier?.verbs).toContainEqual({
      v: "lookup",
      args: ["<name>"],
      needsStore: true,
      mcp: "tier_lookup",
    });
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
    // graph adds the SPARQL escape hatch (`query`) in PR6, alongside `inspect`.
    expect(emitted.nouns.graph?.verbs).toEqual([
      {
        v: "inspect",
        args: ["<uri>"],
        needsStore: true,
        mcp: "graph_inspect",
      },
      {
        v: "query",
        args: ["<sparql>"],
        needsStore: true,
        mcp: "graph_query",
      },
    ]);
  });

  it("emits the PR6 effect/diagnostic self-verbs (doctor, upgrade)", () => {
    // doctor is a storeless read self-verb — no args, no flags, no needsStore.
    expect(emitted.nouns.doctor?.verbs).toEqual([
      { v: "doctor", mcp: "doctor" },
    ]);
    // upgrade is a storeless mutation self-verb — mutates, no args, no needsStore.
    expect(emitted.nouns.upgrade?.verbs).toEqual([
      { v: "upgrade", mutates: true, mcp: "upgrade" },
    ]);
  });

  it("emits the PR10 colophon self-verb (storeless read)", () => {
    // colophon is a storeless read self-verb — no args, no flags, no needsStore.
    expect(emitted.nouns.colophon?.verbs).toEqual([
      { v: "colophon", mcp: "colophon" },
    ]);
  });

  it("emits setup as a mixed self+sub noun (self is a tool, sub-verbs are mcp:false)", () => {
    // The one covenant noun both directly runnable AND with sub-verbs. The self
    // verb is the `setup` tool; the four installers are CLI-only (mcp:false).
    // The band-aware verbs (setup/mcp/skills) carry the --scope/--global/--local
    // flags; completions/lsp are single-band installers with no scope.
    expect(emitted.nouns.setup?.verbs).toEqual([
      {
        v: "setup",
        flags: ["--scope", "--global", "--local"],
        mutates: true,
        mcp: "setup",
      },
      {
        v: "mcp",
        flags: ["--scope", "--global", "--local"],
        mutates: true,
        mcp: false,
      },
      { v: "completions", mutates: true, mcp: false },
      {
        v: "skills",
        flags: ["--scope", "--global", "--local"],
        mutates: true,
        mcp: false,
      },
      { v: "lsp", mutates: true, mcp: false },
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
      "colophon",
    ]) {
      expect(tools).toContain(tool);
    }
  });
});

describe("surface COMPLETE — emitted == covenant (PROTECTED)", () => {
  const emitted = emitSurface(capabilities);

  // The CLOSING direction: assertConforms already proves emitted ⊆ covenant;
  // this proves covenant ⊆ emitted, so together the tool sets are EQUAL — the
  // surface-complete milestone. After PR7, every covenant tool is realized.
  it("emits every covenant tool (all 40) — set equality with the covenant", () => {
    const emittedTools = new Set(emitted.mcpSurface.tools);
    const missing = golden.mcpSurface.tools.filter((t) => !emittedTools.has(t));
    expect(missing).toEqual([]);
    expect([...emitted.mcpSurface.tools].sort()).toEqual(
      [...golden.mcpSurface.tools].sort(),
    );
    expect(emitted.mcpSurface.tools).toHaveLength(40);
  });

  // The covenant edit: the non-tool MCP surface is frozen too.
  it("freezes the non-tool MCP surface (resources/prompts/instructions)", () => {
    expect(emitted.mcpSurface.resources).toEqual(["pragma:{+uri}"]);
    expect(emitted.mcpSurface.resources).toEqual(golden.mcpSurface.resources);
    expect(emitted.mcpSurface.prompts).toBe(true);
    expect(emitted.mcpSurface.prompts).toBe(golden.mcpSurface.prompts);
    expect(emitted.mcpSurface.instructions).toBe(true);
    expect(emitted.mcpSurface.instructions).toBe(
      golden.mcpSurface.instructions,
    );
  });
});
