import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import createTestMcpClient from "../../../testing/helpers/createTestMcpClient.js";
import createTestRuntime from "../../../testing/helpers/createTestRuntime.js";
import type { PragmaContext } from "../../shared/context.js";
import type { PragmaRuntime } from "../../shared/types/index.js";
import buildCapabilitiesCommand from "./capabilities.js";

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

function makeCtx(format: "text" | "json" = "text"): PragmaContext {
  return {
    ...runtime,
    globalFlags: { llm: false, format, verbose: false },
  };
}

function renderPlain(result: unknown): string {
  const typed = result as {
    tag: string;
    render: { plain: (v: unknown) => string };
    value: unknown;
  };
  expect(typed.tag).toBe("output");
  return typed.render.plain(typed.value);
}

describe("capabilities --detail state (default)", () => {
  it("defaults to the state level", async () => {
    const ctx = makeCtx("json");
    const result = await buildCapabilitiesCommand(ctx).execute(
      { detail: "state" },
      ctx,
    );
    const viaDefault = await buildCapabilitiesCommand(ctx).execute({}, ctx);
    expect(JSON.parse(renderPlain(viaDefault))).toEqual(
      JSON.parse(renderPlain(result)),
    );
  });

  it("--format json mirrors resources/read pragma://state exactly", async () => {
    const ctx = makeCtx("json");
    const result = await buildCapabilitiesCommand(ctx).execute(
      { detail: "state" },
      ctx,
    );
    const payload = JSON.parse(renderPlain(result));

    const resource = await client.readResource({ uri: "pragma://state" });
    const text = (resource.contents[0] as { text: string }).text;
    expect(payload).toEqual(JSON.parse(text));
  });

  it("text view renders from the payload (value, origin, change hints)", async () => {
    const ctx = makeCtx();
    const result = await buildCapabilitiesCommand(ctx).execute({}, ctx);
    const text = renderPlain(result);

    // Single-chalk-span substrings only: CI runs with color ON.
    expect(text).toContain("Pragma state");
    expect(text).toContain("tier");
    expect(text).toContain("[project]");
    expect(text).toContain("config_tier { path }");
    expect(text).toContain("allTiers: true on list tools");
  });
});

describe("capabilities --detail prompts", () => {
  it("--format json mirrors prompts/list exactly", async () => {
    const ctx = makeCtx("json");
    const result = await buildCapabilitiesCommand(ctx).execute(
      { detail: "prompts" },
      ctx,
    );
    const payload = JSON.parse(renderPlain(result));

    const protocol = await client.listPrompts();
    expect(payload).toEqual(JSON.parse(JSON.stringify(protocol)));
  });

  it("text view lists prompt names", async () => {
    const ctx = makeCtx();
    const result = await buildCapabilitiesCommand(ctx).execute(
      { detail: "prompts" },
      ctx,
    );
    const text = renderPlain(result);
    expect(text).toContain("implement-component");
    expect(text).toContain("fix-empty-results");
  });
});

describe("capabilities --detail reference", () => {
  it("--format json mirrors tools/list exactly", async () => {
    const ctx = makeCtx("json");
    const result = await buildCapabilitiesCommand(ctx).execute(
      { detail: "reference" },
      ctx,
    );
    const payload = JSON.parse(renderPlain(result)) as {
      tools: { name: string }[];
    };

    const protocol = await client.listTools();
    expect(payload).toEqual(JSON.parse(JSON.stringify(protocol)));
    // The aggregator lists itself — no special-casing.
    expect(payload.tools.map((t) => t.name)).toContain("capabilities");
  });

  it("text view shows tool names with access modes", async () => {
    const ctx = makeCtx();
    const result = await buildCapabilitiesCommand(ctx).execute(
      { detail: "reference" },
      ctx,
    );
    const text = renderPlain(result);
    expect(text).toContain("block_list");
    expect(text).toContain("config_tier");
    expect(text).toContain("mirror of MCP tools/list");
  });
});

describe("capabilities --detail validation", () => {
  it("rejects an unknown level with INVALID_INPUT", async () => {
    const ctx = makeCtx();
    await expect(
      buildCapabilitiesCommand(ctx).execute({ detail: "workflows" }, ctx),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(
      buildCapabilitiesCommand(ctx).execute({ detail: "workflows" }, ctx),
    ).rejects.toBeInstanceOf(PragmaError);
  });
});
