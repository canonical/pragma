import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it } from "vitest";
import { CONVENTIONS } from "../../../../capabilities/capabilities/catalog.js";
import { capabilities } from "../../../../capabilities/index.js";
import type { McpHarness } from "../../../../testing/helpers/projectMcp.js";
import { projectMcp } from "../../../../testing/helpers/projectMcp.js";
import type { PragmaRuntime } from "../../../runtime/types.js";
import { emitSurface } from "../../../spec/emitSurface.js";
import type { CapabilityModule } from "../../../spec/types.js";
import { buildInstructions, INSTRUCTIONS_MAX_CHARS } from "../instructions.js";
import { fillTemplate, promptProvider } from "./provider.js";
import { readPrompts } from "./source.js";

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-prompts-"));

/** A synthetic module that installs the native prompt surface (commit 3 wires
 * the real prompt module; commit 2 proves the hook mechanism in isolation). */
const promptHostModule: CapabilityModule = {
  name: "test-prompt-host",
  verbs: [],
  mcpPrompts: promptProvider,
};

let harness: McpHarness | undefined;
afterEach(async () => {
  await harness?.cleanup();
  harness = undefined;
});

describe("instructions — handshake orientation (PROTECTED)", () => {
  it("is present, non-empty, mentions capabilities + the discovery flow", () => {
    const text = buildInstructions(capabilities);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("capabilities");
    expect(text.toLowerCase()).toContain("discovery sequence");
  });

  it("stays under the length ceiling (cannot bloat)", () => {
    expect(buildInstructions(capabilities).length).toBeLessThanOrEqual(
      INSTRUCTIONS_MAX_CHARS,
    );
  });

  it("opens with the shared catalog's conventions, verbatim and once", () => {
    // The conventions are authored once (capabilities/catalog.ts); instructions
    // must OPEN with them, so a second hand-written preamble cannot creep back
    // in and drift from the `capabilities` tool the same handshake carries.
    expect(buildInstructions(capabilities).startsWith(CONVENTIONS.system)).toBe(
      true,
    );
  });

  it("quotes the resource templates the MCP surface actually advertises", () => {
    // The `pragma:` scheme is covenant-frozen protocol identity
    // (surface.v2.json). The orientation DERIVES it from the emitted surface
    // instead of hand-copying it, so the two cannot disagree.
    const { resources } = emitSurface(capabilities).mcpSurface;
    expect(resources.length).toBeGreaterThan(0);
    const text = buildInstructions(capabilities);
    for (const template of resources) expect(text).toContain(template);
  });

  it("states the plan-first/confirm convention in the orientation (D2)", () => {
    // The confirm gate must be surfaced at handshake, not discovered by an agent
    // tripping it. Same single source as the `capabilities` tool's conventions.
    const text = buildInstructions(capabilities);
    expect(text.toLowerCase()).toContain("plan-first");
    expect(text).toContain("confirm: true");
  });

  it("orients a cold agent to check/build the store before any store read", () => {
    // Store-blind guard: the handshake must point a cold agent at the store
    // pre-check (sources_status → sources_update) BEFORE the sample/query steps,
    // or it walks straight into STORE_UNAVAILABLE.
    const text = buildInstructions(capabilities);
    const storeCheck = text.indexOf("sources_status");
    const sample = text.indexOf("_sample");
    expect(storeCheck).toBeGreaterThanOrEqual(0);
    expect(text).toContain("sources_update");
    expect(storeCheck).toBeLessThan(sample);
  });
});

describe("MCP handshake — capabilities advertised (PROTECTED)", () => {
  it("advertises tools, resources, AND prompts", async () => {
    harness = await projectMcp([...capabilities, promptHostModule], freshCwd());
    const caps = harness.serverCapabilities();
    expect(caps?.tools).toBeDefined();
    expect(caps?.resources).toBeDefined();
    expect(caps?.prompts).toBeDefined();
  });

  it("sends the instructions string at initialize", async () => {
    harness = await projectMcp([...capabilities, promptHostModule], freshCwd());
    const instructions = harness.instructions();
    expect(instructions).toBeDefined();
    expect(instructions).toContain("capabilities");
  });

  it("lists zero prompts without a store when no prompt entities exist", async () => {
    harness = await projectMcp([...capabilities, promptHostModule], freshCwd());
    const prompts = await harness.listPrompts();
    expect(prompts).toEqual([]);
  });
});

/** A runtime whose SPARQL facade always fails with `message`. */
function failingRuntime(message: string): PragmaRuntime {
  return {
    query: {
      sparql: () => Promise.reject(new Error(message)),
    },
  } as unknown as PragmaRuntime;
}

/** Every field at the default layer — the embedded pack answers, so the store IS available. */
const DEFAULT_ORIGINS = {
  name: "default",
  help: "default",
  colophon: "default",
  issuesUrl: "default",
  tier: "default",
  channel: "default",
  detail: "default",
  packs: "default",
  generators: "default",
  stories: "default",
  prefixes: "default",
} as const;

/**
 * The same failing facade, wearing the shape `promptProvider.register` needs:
 * a cwd whose store is AVAILABLE (so `guardStore` passes and the read is what
 * fails) plus a `loadConfig` the readiness check can resolve.
 */
function failingProviderRuntime(cwd: string, message: string): PragmaRuntime {
  return {
    cwd,
    loadConfig: async () => ({
      config: { channel: "normal" as const },
      origins: DEFAULT_ORIGINS,
      global: { path: "/nonexistent", exists: false },
      project: { exists: false },
    }),
    query: { sparql: () => Promise.reject(new Error(message)) },
  } as unknown as PragmaRuntime;
}

describe("native prompts/get — a failed read reaches the agent as one", () => {
  it("carries the machine code and recovery, not a bare Error", async () => {
    // The native surface signals failure by THROWING, so a read that fails must
    // be projected the way the resource browser projects its own — with `code`
    // and `recovery` in the JSON-RPC `data`. Otherwise the store diagnosis is
    // lost between `prompt_lookup` (which envelopes it) and `prompts/get`.
    const handlers = new Map<unknown, (request: unknown) => Promise<unknown>>();
    const stubServer = {
      server: {
        registerCapabilities: () => {},
        setRequestHandler: (
          schema: unknown,
          handler: (request: unknown) => Promise<unknown>,
        ) => {
          handlers.set(schema, handler);
        },
      },
    };
    await promptProvider.register(
      stubServer as never,
      failingProviderRuntime(freshCwd(), "Prefix not found: ds"),
    );

    const get = handlers.get(GetPromptRequestSchema);
    expect(get).toBeDefined();
    await expect(
      get?.({ params: { name: "build-a-block" } }),
    ).rejects.toMatchObject({
      data: {
        code: "STORE_UNAVAILABLE",
        recovery: { mcp: { tool: "sources_update" } },
      },
    });
  });
});

describe("readPrompts — a failed read is never an empty graph", () => {
  it("reports an unbound prefix as a store that needs building", async () => {
    // A pack whose store does not know the declared prompt namespace cannot
    // answer, and the actionable form of that is STORE_UNAVAILABLE with the
    // build command — not a silent zero-prompt listing.
    await expect(
      readPrompts(failingRuntime("Prefix not found: ds")),
    ).rejects.toMatchObject({
      code: "STORE_UNAVAILABLE",
      recovery: { mcp: { tool: "sources_update" } },
    });
  });

  it("propagates a query failure instead of returning no prompts", async () => {
    // The exact defect a bare `catch {}` here caused: a malformed declaration
    // becomes a parse error, the parse error becomes `[]`, and the user is told
    // the distribution ships no prompts. It must surface as a failure.
    await expect(
      readPrompts(failingRuntime("SPARQL syntax error at line 2")),
    ).rejects.toThrow(/syntax error/);
  });
});

describe("fillTemplate — argument substitution", () => {
  it("replaces {{arg}} placeholders and leaves unknowns intact", () => {
    expect(
      fillTemplate("Build {{name}} in {{framework}}", { name: "Button" }),
    ).toBe("Build Button in {{framework}}");
  });

  it("returns the body unchanged when no arguments are given", () => {
    expect(fillTemplate("static body", undefined)).toBe("static body");
  });
});
