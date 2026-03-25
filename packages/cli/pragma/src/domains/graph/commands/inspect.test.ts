import type { CommandDefinition } from "@canonical/cli-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestRuntime from "../../../testing/helpers/createTestRuntime.js";
import type { PragmaContext } from "../../shared/context.js";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { InspectResult } from "../../shared/types.js";
import buildInspectCommand from "./inspect.js";

let runtime: PragmaRuntime;

beforeAll(async () => {
  runtime = await createTestRuntime();
});

afterAll(() => {
  runtime.dispose();
});

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    ...runtime,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    ...overrides,
  };
}

async function executeOutput(
  cmd: CommandDefinition,
  params: Record<string, unknown>,
  ctx: PragmaContext,
): Promise<{ value: unknown; text: string }> {
  const result = await cmd.execute(params, ctx);
  expect(result.tag).toBe("output");
  if (result.tag !== "output") throw new Error("Expected output result");
  return { value: result.value, text: result.render.plain(result.value) };
}

describe("graph inspect command", () => {
  const uri = `${PREFIX_MAP.ds}global.component.button`;

  it("returns inspect results", async () => {
    const ctx = makeCtx();
    const cmd = buildInspectCommand(ctx);
    const { value } = await executeOutput(cmd, { uri }, ctx);

    const result = value as InspectResult;
    expect(result.uri).toBe(uri);
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it("renders plain output", async () => {
    const ctx = makeCtx();
    const cmd = buildInspectCommand(ctx);
    const { text } = await executeOutput(cmd, { uri }, ctx);

    expect(text).toContain("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  });

  it("renders llm output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildInspectCommand(ctx);
    const { text } = await executeOutput(cmd, { uri }, ctx);

    expect(text).toContain("##");
    expect(text).toContain(uri);
  });

  it("renders json output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildInspectCommand(ctx);
    const { text } = await executeOutput(cmd, { uri }, ctx);

    const parsed = JSON.parse(text) as InspectResult;
    expect(parsed.uri).toBe(uri);
  });

  it("throws structured error when uri is missing", async () => {
    const ctx = makeCtx();
    const cmd = buildInspectCommand(ctx);

    await expect(cmd.execute({}, ctx)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: {
        cli: "pragma graph query 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10'",
        mcp: { tool: "graph_query" },
      },
    });
  });
});
