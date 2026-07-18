import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestMcpClient from "../../../testing/helpers/createTestMcpClient.js";
import createTestRuntime from "../../../testing/helpers/createTestRuntime.js";
import type { PragmaContext } from "../../shared/context.js";
import type { PragmaRuntime } from "../../shared/types/index.js";
import buildPromptListCommand from "./list.js";
import buildPromptLookupCommand from "./lookup.js";

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

function renderPlain(result: {
  tag: string;
  render?: { plain: (v: unknown) => string };
  value?: unknown;
}): string {
  expect(result.tag).toBe("output");
  return (
    result as { render: { plain: (v: unknown) => string }; value: unknown }
  ).render.plain((result as { render: unknown; value: unknown }).value);
}

describe("prompt list", () => {
  it("lists the bundled prompts with args columns", async () => {
    const ctx = makeCtx();
    const result = await buildPromptListCommand(ctx).execute({}, ctx);
    const text = renderPlain(result as never);

    expect(text).toContain("implement-component");
    expect(text).toContain("component");
    expect(text).toContain("category?");
    expect(text).toContain("fix-empty-results");
  });

  it("--format json mirrors prompts/list exactly", async () => {
    const ctx = makeCtx("json");
    const result = await buildPromptListCommand(ctx).execute({}, ctx);
    const payload = JSON.parse(renderPlain(result as never));

    const protocol = await client.listPrompts();
    expect(payload).toEqual(JSON.parse(JSON.stringify(protocol)));
  });
});

describe("prompt lookup", () => {
  it("hydrates a prompt with key=value args", async () => {
    const ctx = makeCtx();
    const result = await buildPromptLookupCommand(ctx).execute(
      { input: ["implement-component", "component=Button"] },
      ctx,
    );
    const text = renderPlain(result as never);

    expect(text).toContain("You are implementing the Button component");
    expect(text).toContain("## Component spec");
  });

  it("--format json equals the MCP prompts/get result (mirror)", async () => {
    const ctx = makeCtx("json");
    const result = await buildPromptLookupCommand(ctx).execute(
      { input: ["implement-component", "component=Button"] },
      ctx,
    );
    const cliPayload = JSON.parse(renderPlain(result as never));

    const mcpPayload = await client.getPrompt({
      name: "implement-component",
      arguments: { component: "Button" },
    });

    expect(cliPayload).toEqual(JSON.parse(JSON.stringify(mcpPayload)));
  });

  it("rejects a malformed key=value pair", async () => {
    const ctx = makeCtx();
    await expect(
      buildPromptLookupCommand(ctx).execute(
        { input: ["implement-component", "not-a-pair"] },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejects an unknown arg key naming the declared args", async () => {
    const ctx = makeCtx();
    await expect(
      buildPromptLookupCommand(ctx).execute(
        { input: ["implement-component", "bogus=x"] },
        ctx,
      ),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      validOptions: ["component"],
    });
  });

  it("rejects a missing required arg with its description", async () => {
    const ctx = makeCtx();
    await expect(
      buildPromptLookupCommand(ctx).execute(
        { input: ["implement-component"] },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("suggests near-miss names and points at prompt list", async () => {
    const ctx = makeCtx();
    await expect(
      buildPromptLookupCommand(ctx).execute({ input: ["implement-comp"] }, ctx),
    ).rejects.toMatchObject({
      code: "ENTITY_NOT_FOUND",
      suggestions: expect.arrayContaining(["implement-component"]),
      recovery: expect.objectContaining({ cli: "pragma prompt list" }),
    });
  });

  it("completes prompt names", async () => {
    const ctx = makeCtx();
    const command = buildPromptLookupCommand(ctx);
    const complete = command.parameters.at(0)?.complete;
    expect(complete).toBeDefined();
    const values = await complete?.("imp", ctx);
    expect(values).toEqual(["implement-component"]);
  });
});
