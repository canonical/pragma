import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it } from "vitest";
import {
  BLOCKS_SENTENCE,
  CONVENTIONS,
} from "../../../../capabilities/capabilities/catalog.js";
import { capabilities } from "../../../../capabilities/index.js";
import type { McpHarness } from "../../../../testing/helpers/projectMcp.js";
import { projectMcp } from "../../../../testing/helpers/projectMcp.js";
import type { PragmaRuntime } from "../../../runtime/types.js";
import { emitSurface, toolName } from "../../../spec/emitSurface.js";
import type { CapabilityModule, VerbSpec } from "../../../spec/types.js";
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
  // A client may defer tools: the agent sees tool NAMES and this text, and a
  // description it never loads cannot steer it. So the text carries a question →
  // tool index GENERATED from each verb's `useWhen` (it replaced the prose
  // "discovery sequence" this case used to look for).
  const reads = capabilities
    .flatMap((module) => module.verbs)
    .filter(
      (verb) =>
        !verb.hidden && verb.capability.mcp.expose && !verb.capability.mutates,
    );
  const isTrio = (verb: VerbSpec): boolean =>
    ["list", "lookup", "sample"].includes(verb.path[1] ?? "");

  it("indexes every read tool outside a list/lookup/sample trio by the question it answers", () => {
    const text = buildInstructions(capabilities);
    const standalone = reads.filter((verb) => !isTrio(verb));
    expect(standalone.length).toBeGreaterThan(10);
    for (const verb of standalone) {
      const clause = (verb.useWhen as string).replace(/^when asked /, "");
      expect(text).toContain(`${toolName(verb.path)} — ${clause}`);
    }
    // The story that failed: asked which components use a token.
    expect(text).toMatch(/token_consumers — which components use a token/);
  });

  it("explains the trio once, promising no noun a verb it lacks", () => {
    const text = buildInstructions(capabilities);
    expect(text.match(/<noun>_list/g)).toHaveLength(1);
    expect(text).toMatch(/block\*/); // has a sample
    expect(text).toMatch(/\btier,/); // list + lookup, no sample
    expect(text).toMatch(/implementation†/); // list only
  });

  it("is generated: a new read verb adds its own line, a new write joins the plan-first list", () => {
    const base = capabilities.find((m) => m.name === "info")
      ?.verbs[0] as VerbSpec;
    const added: CapabilityModule = {
      name: "weather",
      verbs: [
        {
          ...base,
          path: ["weather", "today"],
          useWhen: "when asked if it rains",
        },
        {
          ...base,
          path: ["weather", "seed"],
          capability: { ...base.capability, mutates: true },
        },
      ],
    };
    const text = buildInstructions([...capabilities, added]);
    expect(text).toMatch(/^weather_today — if it rains$/m);
    expect(text).toMatch(/plan-first[^\n]*weather_seed/);
    expect(buildInstructions([added])).toBe(""); // no module declares an orientation
  });

  it("fits the HARD ceiling clients cut server instructions at", () => {
    // Unlike the catalogue budget this is not raised on measurement: text past
    // about 2 KB is text no agent reads. Tighten a sentence instead.
    expect(INSTRUCTIONS_MAX_CHARS).toBe(2000);
    const dropped: number[] = [];
    const text = buildInstructions(capabilities, (count) =>
      dropped.push(count),
    );
    expect(text.length).toBeLessThanOrEqual(INSTRUCTIONS_MAX_CHARS);
    // Fitting is the safety net for a project's packs, not for the
    // distribution: its own registry must fit WHOLE.
    expect(
      dropped,
      "the distribution's own index no longer fits — tighten a useWhen sentence; the 2,000 ceiling is what clients keep",
    ).toEqual([]);
  });

  it("when a project's packs overflow it, drops index lines from the end and says so", () => {
    const base = capabilities.find((m) => m.name === "info")
      ?.verbs[0] as VerbSpec;
    const crowd: CapabilityModule = {
      name: "crowd",
      verbs: Array.from({ length: 12 }, (_, n) => ({
        ...base,
        path: ["crowd", `probe${n}`] as [string, string],
        category: undefined,
        useWhen: `when asked a long question number ${n} about the crowd`,
      })),
    };
    const dropped: number[] = [];
    const text = buildInstructions([...capabilities, crowd], (count) =>
      dropped.push(count),
    );
    expect(text.length).toBeLessThanOrEqual(INSTRUCTIONS_MAX_CHARS);
    expect(dropped).toHaveLength(1);
    expect(text.endsWith(`… and ${dropped[0]} more: call capabilities.`)).toBe(
      true,
    );
    // What is one line whatever the registry holds is never what gets cut …
    expect(text).toContain(BLOCKS_SENTENCE);
    expect(text).toMatch(/plan-first/);
    expect(text).toMatch(/<noun>_list/);
    // … and the verbs that read the store lead the index, so they survive.
    expect(text).toMatch(/^token_consumers — /m);
  });

  it("emits no heading for an empty group, and skips a verb declaring no useWhen", () => {
    const base = capabilities.find((m) => m.name === "capabilities");
    const { useWhen: _useWhen, ...silent } = base?.verbs[0] as VerbSpec;
    const text = buildInstructions([
      { ...(base as CapabilityModule), verbs: [silent as VerbSpec] },
    ]);
    expect(text).not.toContain("When asked:");
    expect(text).not.toContain("Also:");
    expect(text).not.toContain("undefined");
  });

  it("opens with the shared catalog's conventions, verbatim and once", () => {
    // The conventions are authored once (capabilities/catalog.ts) and handed to
    // the kernel as the module's `mcpOrientation`; instructions
    // must OPEN with them, so a second hand-written preamble cannot creep back
    // in and drift from the `capabilities` tool the same handshake carries.
    expect(buildInstructions(capabilities).startsWith(CONVENTIONS.system)).toBe(
      true,
    );
  });

  it("says which tools read components, patterns, layouts and subcomponents", () => {
    // People ask about "components"; the tools are named for blocks. An agent
    // that went looking for a component tool found none and fell to raw SPARQL.
    const text = buildInstructions(capabilities);
    expect(text).toContain(BLOCKS_SENTENCE);
    expect(BLOCKS_SENTENCE).toMatch(/components.*block_list/i);
    // Said in the handshake and in `block_list`'s own description — not a third
    // time in the catalogue's conventions.
    expect(Object.values(CONVENTIONS)).not.toContain(BLOCKS_SENTENCE);
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

  it("tells an agent which tool explains empty or stale answers, and which rebuilds", () => {
    // This case used to pin POSITION (`sources_status` before any `_sample`),
    // from when a cold store failed every read and the text was a numbered
    // sequence. A fresh install now answers from the shipped snapshot, and the
    // text is an index whose fixed lines come first so an overflow can only
    // cut the index. What must still hold: the store check is indexed by the
    // situation that calls for it, and the rebuild is among the writes.
    const text = buildInstructions(capabilities);
    expect(text).toMatch(/^sources_status — when results look empty or stale/m);
    expect(text).toMatch(/plan-first[^\n]*sources_update/);
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
function createFailingRuntime(message: string): PragmaRuntime {
  return {
    query: {
      sparql: () => Promise.reject(new Error(message)),
    },
  } as unknown as PragmaRuntime;
}

/** Every field at the default layer — the embedded pack answers, so the store IS available. */
const DEFAULT_ORIGINS = {
  tier: "default",
  channel: "default",
  detail: "default",
  packs: "default",
  stories: "default",
  prefixes: "default",
} as const;

/**
 * The same failing facade, wearing the shape `promptProvider.register` needs:
 * a cwd whose store is AVAILABLE (so `guardStore` passes and the read is what
 * fails) plus a `loadConfig` the readiness check can resolve.
 */
function createFailingProviderRuntime(
  cwd: string,
  message: string,
): PragmaRuntime {
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
      createFailingProviderRuntime(freshCwd(), "Prefix not found: ds"),
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
  it("reports an unbound prefix as a store that cannot answer, not as no prompts", async () => {
    // A pack whose store does not know the declared prompt namespace cannot
    // answer, and the actionable form of that is STORE_UNAVAILABLE with the
    // build command — not a silent zero-prompt listing.
    await expect(
      readPrompts(createFailingRuntime("Prefix not found: ds")),
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
      readPrompts(createFailingRuntime("SPARQL syntax error at line 2")),
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
