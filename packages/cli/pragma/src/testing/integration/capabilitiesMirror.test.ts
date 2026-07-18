/**
 * Layer 3: THE MIRROR INVARIANT parity suite.
 *
 * `pragma capabilities --detail <level> --format json` must return the
 * EXACT protocol payload the MCP server serves — `state` ≡ the JSON text
 * of `resources/read pragma://state`, `prompts` ≡ the `prompts/list`
 * result, `reference` ≡ the `tools/list` result. The `capabilities`
 * aggregator tool's fields must each equal their protocol source, and
 * its `{ prompt, args }` mode must equal `prompts/get` AND the CLI
 * `pragma prompt lookup --format json`. One shared runtime backs both
 * surfaces, so any drift is a code bug, not a fixture skew.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_ORIGINS } from "#config";
import type { PragmaError } from "#error";
import buildCapabilitiesCommand from "../../domains/capabilities/commands/capabilities.js";
import buildPromptLookupCommand from "../../domains/prompt/commands/lookup.js";
import type { PragmaContext } from "../../domains/shared/context.js";
import { createLazyGraphql } from "../../domains/shared/runtime.js";
import type { PragmaRuntime } from "../../domains/shared/types/index.js";
import { createMcpServerFromRuntime } from "../../mcp/createMcpServer.js";
import collectCommands from "../../pipeline/collectCommands.js";
import { renderErrorJson } from "../../pipeline/renderError.js";
import createTestMcpClient from "../helpers/createTestMcpClient.js";
import createTestRuntime from "../helpers/createTestRuntime.js";
import { createTestStore } from "../store.js";
import { RECIPE_PREFIXES, RECIPE_STORY, RECIPE_TTL } from "../storyFixtures.js";

let runtime: PragmaRuntime;
let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  runtime = await createTestRuntime();
  const mcp = await createTestMcpClient(runtime);
  client = mcp.client;
  cleanup = mcp.cleanup;
});

afterAll(async () => {
  await cleanup();
  runtime.dispose();
});

function makeCtx(format: "text" | "json" = "json"): PragmaContext {
  return {
    ...runtime,
    globalFlags: { llm: false, format, verbose: false },
  };
}

/** Run a command definition and return its rendered plain/json output. */
async function runCommand(
  ctx: PragmaContext,
  build: (ctx: PragmaContext) => {
    execute: (
      params: Record<string, unknown>,
      ctx: PragmaContext,
    ) => Promise<unknown>;
  },
  params: Record<string, unknown> = {},
): Promise<string> {
  const result = (await build(ctx).execute(params, ctx)) as {
    tag: string;
    render: { plain: (v: unknown) => string };
    value: unknown;
  };
  expect(result.tag).toBe("output");
  return result.render.plain(result.value);
}

/** Serialize through JSON to drop `undefined` fields, like the wire does. */
function wire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Fetch the RAW `tools/list` result — the exact objects the server would
 * `JSON.stringify` onto a stdio transport. The SDK Client re-parses every
 * result through its zod result schemas, which rebuilds objects in
 * schema-shape key order and so MASKS wire key order; byte-identity can
 * only be refereed against the raw JSON-RPC response message.
 */
async function rawToolsList(): Promise<{
  tools: readonly Record<string, unknown>[];
}> {
  const { server } = await createMcpServerFromRuntime(runtime);
  const [serverTransport, rawTransport] = InMemoryTransport.createLinkedPair();
  const pending = new Map<number, (msg: Record<string, unknown>) => void>();
  rawTransport.onmessage = (message: JSONRPCMessage) => {
    const msg = message as unknown as Record<string, unknown>;
    if (typeof msg.id === "number") {
      pending.get(msg.id)?.(msg);
    }
  };
  await server.connect(serverTransport);
  await rawTransport.start();
  const request = (
    id: number,
    method: string,
    params: Record<string, unknown>,
  ) =>
    new Promise<Record<string, unknown>>((resolve) => {
      pending.set(id, resolve);
      void rawTransport.send({
        jsonrpc: "2.0",
        id,
        method,
        params,
      } as JSONRPCMessage);
    });

  try {
    await request(1, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "raw-wire-client", version: "0.0.0" },
    });
    await rawTransport.send({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    } as JSONRPCMessage);
    const response = await request(2, "tools/list", {});
    return response.result as { tools: readonly Record<string, unknown>[] };
  } finally {
    await server.close();
  }
}

/** Parse a tool-call result's envelope. */
function parseEnvelope(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const content = result.content as unknown[];
  const first = content[0] as { type: string; text: string };
  return JSON.parse(first.text) as Record<string, unknown>;
}

describe("mirror invariant — CLI levels ≡ protocol payloads", () => {
  it("--detail reference ≡ tools/list (deep equal)", async () => {
    const payload = JSON.parse(
      await runCommand(makeCtx(), buildCapabilitiesCommand, {
        detail: "reference",
      }),
    ) as { tools: unknown[]; nextCursor?: string };

    const protocol = (await client.listTools()) as {
      tools: unknown[];
      nextCursor?: string;
    };
    // The in-memory server never paginates; strip nextCursor defensively.
    const { nextCursor: _ignored, ...rest } = protocol;
    expect(payload).toEqual(wire(rest));
  });

  it("--detail prompts ≡ prompts/list (deep equal)", async () => {
    const payload = JSON.parse(
      await runCommand(makeCtx(), buildCapabilitiesCommand, {
        detail: "prompts",
      }),
    );
    expect(payload).toEqual(wire(await client.listPrompts()));
  });

  it("--detail state ≡ resources/read pragma://state (deep equal)", async () => {
    const payload = JSON.parse(
      await runCommand(makeCtx(), buildCapabilitiesCommand, {
        detail: "state",
      }),
    );
    const resource = await client.readResource({ uri: "pragma://state" });
    expect(payload).toEqual(
      JSON.parse((resource.contents[0] as { text: string }).text),
    );
  });

  it("default level is state", async () => {
    const viaDefault = JSON.parse(
      await runCommand(makeCtx(), buildCapabilitiesCommand),
    );
    const viaState = JSON.parse(
      await runCommand(makeCtx(), buildCapabilitiesCommand, {
        detail: "state",
      }),
    );
    expect(viaDefault).toEqual(viaState);
  });
});

describe("mirror invariant — aggregator ≡ protocol surfaces", () => {
  it("aggregate fields equal instructions / state / prompts/list / tools/list", async () => {
    const res = await client.callTool({ name: "capabilities", arguments: {} });
    const envelope = parseEnvelope(res);
    expect(envelope.ok).toBe(true);
    const data = envelope.data as {
      instructions: string;
      state: unknown;
      prompts: unknown[];
      tools: { name: string }[];
    };

    expect(data.instructions).toBe(client.getInstructions());

    const resource = await client.readResource({ uri: "pragma://state" });
    expect(data.state).toEqual(
      JSON.parse((resource.contents[0] as { text: string }).text),
    );

    const { prompts } = await client.listPrompts();
    expect(data.prompts).toEqual(wire(prompts));

    const { tools } = await client.listTools();
    expect(data.tools).toEqual(wire(tools));

    // The aggregator includes ITSELF in tools — never special-cased out.
    expect(data.tools.map((t) => t.name)).toContain("capabilities");
  });

  it("aggregator { prompt, args } ≡ prompts/get ≡ pragma prompt lookup --format json", async () => {
    const viaAggregator = parseEnvelope(
      await client.callTool({
        name: "capabilities",
        arguments: {
          prompt: "implement-component",
          args: { component: "Button" },
        },
      }),
    );
    expect(viaAggregator.ok).toBe(true);

    const viaProtocol = await client.getPrompt({
      name: "implement-component",
      arguments: { component: "Button" },
    });

    const viaCli = JSON.parse(
      await runCommand(makeCtx(), buildPromptLookupCommand, {
        input: ["implement-component", "component=Button"],
      }),
    );

    expect(viaAggregator.data).toEqual(wire(viaProtocol));
    expect(viaCli).toEqual(wire(viaProtocol));
  });
});

describe("mirror invariant — byte identity with the raw wire", () => {
  it("destructive-annotated entries serialize byte-identically to tools/list", async () => {
    const raw = await rawToolsList();
    // create_component declares destructive: false, so its annotations
    // carry all three hints — the case where two construction paths could
    // (and once did) disagree on key insertion order. `toEqual` is
    // order-insensitive; only JSON.stringify sees the wire bytes.
    const wireEntry = raw.tools.find(
      (tool) => tool.name === "create_component",
    );
    expect(wireEntry).toBeDefined();
    expect(
      Object.keys((wireEntry as { annotations: object }).annotations),
    ).toEqual(["readOnlyHint", "destructiveHint", "openWorldHint"]);

    const reference = JSON.parse(
      await runCommand(makeCtx(), buildCapabilitiesCommand, {
        detail: "reference",
      }),
    ) as { tools: { name: string }[] };
    const cliEntry = reference.tools.find(
      (tool) => tool.name === "create_component",
    );
    expect(JSON.stringify(cliEntry)).toBe(JSON.stringify(wireEntry));

    const envelope = parseEnvelope(
      (await client.callTool({
        name: "capabilities",
        arguments: {},
      })) as Record<string, unknown>,
    );
    const aggregatorEntry = (
      envelope.data as { tools: { name: string }[] }
    ).tools.find((tool) => tool.name === "create_component");
    expect(JSON.stringify(aggregatorEntry)).toBe(JSON.stringify(wireEntry));
  });
});

describe("mirror invariant — negative-input parity on the prompts/get boundary", () => {
  it("an unknown extra arg errors on prompts/get, the aggregator, and prompt lookup", async () => {
    // prompts/get: the strict argsSchema rejects the unknown key as a
    // protocol-level InvalidParams error (zod v3 would otherwise strip it
    // and silently succeed while the other two surfaces reject).
    await expect(
      client.getPrompt({
        name: "implement-component",
        arguments: { component: "Button", bogus: "x" },
      }),
    ).rejects.toThrow(/Invalid arguments for prompt implement-component/);

    const res = await client.callTool({
      name: "capabilities",
      arguments: {
        prompt: "implement-component",
        args: { component: "Button", bogus: "x" },
      },
    });
    expect(res.isError).toBe(true);
    const mcpError = parseEnvelope(res as Record<string, unknown>).error as {
      code: string;
    };
    expect(mcpError.code).toBe("INVALID_INPUT");

    const ctx = makeCtx();
    const thrown = await buildPromptLookupCommand(ctx)
      .execute(
        { input: ["implement-component", "component=Button", "bogus=x"] },
        ctx,
      )
      .then(
        () => undefined,
        (error) => error as PragmaError,
      );
    expect(thrown?.code).toBe("INVALID_INPUT");
  });

  it("a missing required arg errors on prompts/get, the aggregator, and prompt lookup", async () => {
    await expect(
      client.getPrompt({ name: "implement-component", arguments: {} }),
    ).rejects.toThrow(/Invalid arguments for prompt implement-component/);

    const res = await client.callTool({
      name: "capabilities",
      arguments: { prompt: "implement-component" },
    });
    expect(res.isError).toBe(true);
    const mcpError = parseEnvelope(res as Record<string, unknown>).error as {
      code: string;
    };
    expect(mcpError.code).toBe("INVALID_INPUT");

    const ctx = makeCtx();
    const thrown = await buildPromptLookupCommand(ctx)
      .execute({ input: ["implement-component"] }, ctx)
      .then(
        () => undefined,
        (error) => error as PragmaError,
      );
    expect(thrown?.code).toBe("INVALID_INPUT");
  });
});

describe("mirror invariant — instructions content", () => {
  it("contains the six conventions and the snapshot caveat", () => {
    const instructions = client.getInstructions() ?? "";

    // One anchor substring per authored convention line.
    expect(instructions).toContain("design-system knowledge graph");
    expect(instructions).toContain("scoped by tier");
    expect(instructions).toContain("prefixed IRI");
    expect(instructions).toContain("*_sample");
    expect(instructions).toContain("per-call overrides");
    expect(instructions).toContain("pragma://state");

    // Snapshot caveat.
    expect(instructions).toContain(
      "re-read pragma://state after any config_* call",
    );
  });

  it("snapshot tier/channel match the fixture config", () => {
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toContain(`tier=${runtime.config.tier ?? "unset"}`);
    expect(instructions).toContain(`channel=${runtime.config.channel}`);
  });
});

describe("mirror invariant — zero-results hint parity", () => {
  it("filtered-to-empty pack list carries the same filters+recovery on CLI and MCP", async () => {
    // A recipe pack whose category enum includes a value with no rows —
    // filtering by it yields zero results on both surfaces.
    const story = {
      ...RECIPE_STORY,
      list: {
        ...RECIPE_STORY.list,
        filters: [
          {
            param: "category",
            variable: "category",
            values: ["breakfast", "soup", "dessert"],
          },
        ],
      },
    };
    const { store, cleanup: cleanupStore } = await createTestStore({
      ttl: RECIPE_TTL,
      prefixes: RECIPE_PREFIXES,
    });
    const scopedRuntime: PragmaRuntime = {
      store,
      config: {
        tier: undefined,
        channel: "normal",
        stories: [story],
        prefixes: RECIPE_PREFIXES,
      },
      origins: DEFAULT_ORIGINS,
      cwd: process.cwd(),
      packages: [],
      graphql: createLazyGraphql(store),
      dispose: () => cleanupStore(),
    };
    const mcp = await createTestMcpClient(scopedRuntime);

    try {
      // MCP surface: the error envelope.
      const res = await mcp.client.callTool({
        name: "recipe_list",
        arguments: { category: "dessert" },
      });
      expect(res.isError).toBe(true);
      const mcpError = parseEnvelope(res as Record<string, unknown>).error as {
        code: string;
        filters: Record<string, string>;
        recovery: { tool: string; params?: Record<string, unknown> };
      };

      // CLI surface: the same command throws the same PragmaError; its
      // json render carries the same filters echo and recovery.
      const ctx: PragmaContext = {
        ...scopedRuntime,
        globalFlags: { llm: false, format: "json", verbose: false },
      };
      const listCommand = collectCommands(ctx).find(
        (cmd) => cmd.path.join(" ") === "recipe list",
      );
      expect(listCommand).toBeDefined();
      const thrown = await listCommand
        ?.execute({ category: "dessert" }, ctx)
        .then(
          () => undefined,
          (error) => error as PragmaError,
        );
      expect(thrown?.code).toBe("EMPTY_RESULTS");

      const cliError = JSON.parse(renderErrorJson(thrown as PragmaError)) as {
        code: string;
        filters: Record<string, string>;
        recovery: {
          message: string;
          cli?: string;
          mcp?: { tool: string; params?: Record<string, unknown> };
        };
      };

      expect(mcpError.code).toBe("EMPTY_RESULTS");
      expect(cliError.code).toBe(mcpError.code);
      expect(cliError.filters).toEqual({ category: "dessert" });
      expect(cliError.filters).toEqual(mcpError.filters);
      // The MCP envelope's recovery IS the CLI recovery's mcp projection —
      // one structured recovery serves both surfaces by construction.
      expect(wire(mcpError.recovery)).toEqual(wire(cliError.recovery.mcp));
      expect(cliError.recovery.cli).toBe("pragma recipe list");
      expect(cliError.recovery.message).toBe(
        "List all recipe entries without filters.",
      );
      expect(mcpError.recovery.tool).toBe("recipe_list");
    } finally {
      await mcp.cleanup();
      scopedRuntime.dispose();
    }
  });
});
