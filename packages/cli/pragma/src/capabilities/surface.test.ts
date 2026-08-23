import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildOptionInfo } from "@canonical/summon-core/projection";
import { describe, expect, it } from "vitest";
import { MCP_SERVER_NAME, VERSION } from "../constants.js";
import { emitSurface } from "../kernel/spec/emitSurface.js";
import {
  assertConforms,
  type Covenant,
} from "../kernel/spec/surfaceConformance.js";
import { projectMcp } from "../testing/helpers/projectMcp.js";
import { CREATE_SURFACE } from "./create/createSurface.generated.js";
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

  it("emits config show + the one-command config set, in covenant order (field-verbs retired, B3)", () => {
    // AV-228 B3 retired the per-field `tier`/`channel`/`detail` setters; the
    // config noun is now just the `show` reader and the `set <key> <value>` writer.
    expect(emitted.nouns.config?.verbs).toEqual([
      { v: "show", mcp: "config_show" },
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

  it("emits the read nouns/verbs the packs add (sample only where declared)", () => {
    expect(emitted.nouns.standard?.verbs.map((v) => v.v)).toEqual([
      "list",
      "categories",
      "lookup",
      "sample",
    ]);
    // PR7 completed the surface; block/modifier/token carry no-argument
    // samples (fixedCount), tier declares no sample.
    expect(emitted.nouns.tier?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
    ]);
    expect(emitted.nouns.modifier?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
      "sample",
    ]);
    // `token` is purely declarative since L-OPEN-9 removed `add-config`: the
    // three read verbs its story compiles, and no mutation.
    expect(emitted.nouns.token?.verbs.map((v) => v.v)).toEqual([
      "list",
      "lookup",
      "sample",
    ]);
    // block list is the story's compiled, unfiltered list (L-OPEN-9): no
    // flags — the `--all-tiers` escape died with the hand-written filtering.
    expect(emitted.nouns.block?.verbs).toEqual([
      {
        v: "list",
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
    // The tier lookup is the story's compiled lookup (L-OPEN-9), so it emits
    // the variadic `<name...>` positional every pack lookup emits.
    expect(emitted.nouns.tier?.verbs).toContainEqual({
      v: "lookup",
      args: ["<name...>"],
      needsStore: true,
      mcp: "tier_lookup",
    });
  });

  it("emits the authored read nouns (ontology TBox, storeless skill, graph inspect)", () => {
    expect(emitted.nouns.ontology?.verbs).toEqual([
      { v: "list", needsStore: true, mcp: "ontology_list" },
      {
        v: "lookup",
        args: ["<prefix>"],
        flags: ["--properties", "--full-uris", "--class"],
        needsStore: true,
        mcp: "ontology_lookup",
      },
      // `show` is the deprecated alias of `lookup` (AV-228 B1) — same shape,
      // both blessed in the covenant.
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

  it("emits the L-CIS create noun — projected grammar, deep-equal to the covenant", () => {
    // The create surface DERIVES from the generators' prompts (L-CIS): the
    // framework tree segment is a required positional enum, component's flags
    // are the framework union (incl. the svelte-only --use-ts-stories), and
    // every flag AND positional token is the REGISTERED spelling (L-CIS-2) —
    // a default-true confirm registers ONLY its `--no-<kebab>` form, and the
    // args carry the kebab positional the usage line prints, so the covenant
    // names `--no-with-styles` and `[component-path]`, never a
    // `--with-styles` the CLI rejects or a `[componentPath]` its help never
    // prints. Pin the three entries verbatim so a prompt edit that moves the
    // covenant is SEEN.
    expect(emitted.nouns.create?.verbs).toEqual([
      {
        v: "component",
        args: ["<framework>", "[component-path]"],
        flags: [
          "--no-with-styles",
          "--no-with-stories",
          "--no-with-ssr-tests",
          "--use-ts-stories",
        ],
        mutates: true,
        mcp: "create_component",
      },
      {
        v: "package",
        flags: [
          "--name",
          "--type",
          "--description",
          "--with-react",
          "--with-storybook",
          "--with-cli",
          "--with-pr-template",
          "--no-run-install",
        ],
        mutates: true,
        mcp: "create_package",
      },
      {
        v: "application",
        args: ["[app-path]"],
        // ssr/router are GONE: always-on facts, not prompts — the pair had no
        // reachable explicit form (only `--no-` spellings the generator's own
        // guard rejected), so the projection no longer carries them.
        flags: ["--no-forms", "--relay", "--no-run-install"],
        mutates: true,
        mcp: "create_application",
      },
    ]);
  });

  it("every create covenant flag token is buildOptionInfo's primary registered long form (L-CIS-2)", () => {
    // The derivation tie: the covenant's create tokens must be EXACTLY the
    // long forms the single flag-shape authority yields for the projected
    // prompts — the same expression both binaries register from — so the
    // covenant can never again teach a spelling the CLI rejects (the
    // round-15 F2 defect: kebab-cased param names blessed `--with-styles`
    // and rejected the real `--no-with-styles`).
    const registered = new Map<string, string>();
    for (const surface of Object.values(CREATE_SURFACE)) {
      for (const prompt of surface.prompts) {
        if (prompt.positional === true) continue;
        registered.set(
          prompt.name,
          buildOptionInfo(prompt).flags.split(" ")[0] as string,
        );
      }
    }
    for (const verb of emitted.nouns.create?.verbs ?? []) {
      expect(verb.flags?.length ?? 0).toBeGreaterThan(0);
      for (const token of verb.flags ?? []) {
        expect([...registered.values()]).toContain(token);
      }
    }
    // …and every non-positional projected prompt is named by some entry.
    const covenantTokens = new Set(
      (emitted.nouns.create?.verbs ?? []).flatMap((verb) => verb.flags ?? []),
    );
    for (const [name, token] of registered) {
      expect(covenantTokens.has(token), `${name} → ${token} missing`).toBe(
        true,
      );
    }
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
  it("emits every covenant tool (all 37) — set equality with the covenant", () => {
    const emittedTools = new Set(emitted.mcpSurface.tools);
    const missing = golden.mcpSurface.tools.filter((t) => !emittedTools.has(t));
    expect(missing).toEqual([]);
    expect([...emitted.mcpSurface.tools].sort()).toEqual(
      [...golden.mcpSurface.tools].sort(),
    );
    expect(emitted.mcpSurface.tools).toHaveLength(37);
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

  // The L-PR6 covenant edit (PRA-107 ruling): the wire-identity RULE. The
  // covenant states serverInfo as placeholders — a PROJECTION, deliberately not
  // live values, so a release does not churn the covenant — and the live
  // handshake is asserted to follow it: the server introduces itself with the
  // distribution's declared name and the package version. The fork half of the
  // same rule (a renamed distribution introduces itself under ITS name) is
  // pinned in identity.test.ts, where the conf is mocked.
  it("states the serverInfo projection rule and serves it on the wire", async () => {
    expect(golden.mcpSurface.serverInfo).toEqual({
      name: "<the declared distribution name>",
      version: "<the package version>",
    });

    const mcp = await projectMcp([]);
    const wire = mcp.serverInfo();
    await mcp.cleanup();
    expect(wire).toEqual({ name: MCP_SERVER_NAME, version: VERSION });
  });
});
