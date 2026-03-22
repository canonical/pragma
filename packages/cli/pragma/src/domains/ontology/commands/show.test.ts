import type { CommandDefinition } from "@canonical/cli-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestRuntime from "../../../testing/helpers/createTestRuntime.js";
import type { PragmaContext } from "../../shared/context.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { OntologyDetailed } from "../../shared/types.js";
import buildShowCommand from "./show.js";

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

describe("ontology show command", () => {
  it("returns ontology details", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const { value } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    const result = value as OntologyDetailed;
    expect(result.prefix).toBe("ds");
    expect(result.classes.length).toBeGreaterThan(0);
    expect(result.properties.length).toBeGreaterThan(0);
  });

  it("completes ontology prefixes", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const complete = cmd.parameters[0]?.complete;

    expect(complete).toBeTypeOf("function");
    const matches = await complete?.("d", ctx);
    expect(matches).toContain("ds");
  });

  it("renders plain output", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);
    const { text } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    expect(text).toContain("Classes");
    expect(text).toContain("Properties");
  });

  it("renders llm output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildShowCommand(ctx);
    const { text } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    expect(text).toContain("## ds:");
    expect(text).toContain("### Classes");
  });

  it("renders json output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildShowCommand(ctx);
    const { text } = await executeOutput(cmd, { prefix: "ds" }, ctx);

    const parsed = JSON.parse(text) as OntologyDetailed;
    expect(parsed.prefix).toBe("ds");
  });

  it("throws structured error when prefix is missing", async () => {
    const ctx = makeCtx();
    const cmd = buildShowCommand(ctx);

    await expect(cmd.execute({}, ctx)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: {
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  });
});
