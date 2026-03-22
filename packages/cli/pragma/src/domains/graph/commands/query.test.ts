import type { CommandDefinition } from "@canonical/cli-core";
import type { QueryResult } from "@canonical/ke";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestRuntime from "../../../testing/helpers/createTestRuntime.js";
import type { PragmaContext } from "../../shared/context.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import buildQueryCommand from "./query.js";

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

describe("graph query command", () => {
  const sparql = "SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }";

  it("returns query results", async () => {
    const ctx = makeCtx();
    const cmd = buildQueryCommand(ctx);
    const { value } = await executeOutput(cmd, { sparql }, ctx);

    const result = value as QueryResult;
    expect(result.type).toBe("select");
    if (result.type === "select") {
      expect(Number(result.bindings[0]?.n)).toBeGreaterThan(0);
    }
  });

  it("renders plain output", async () => {
    const ctx = makeCtx();
    const cmd = buildQueryCommand(ctx);
    const { text } = await executeOutput(cmd, { sparql }, ctx);

    expect(text).toContain("n");
  });

  it("renders llm output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildQueryCommand(ctx);
    const { text } = await executeOutput(cmd, { sparql }, ctx);

    const parsed = JSON.parse(text) as QueryResult;
    expect(parsed.type).toBe("select");
  });

  it("renders json output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildQueryCommand(ctx);
    const { text } = await executeOutput(cmd, { sparql }, ctx);

    const parsed = JSON.parse(text) as QueryResult;
    expect(parsed.type).toBe("select");
  });

  it("throws structured error when sparql is missing", async () => {
    const ctx = makeCtx();
    const cmd = buildQueryCommand(ctx);

    await expect(cmd.execute({}, ctx)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recovery: { message: "Provide a SPARQL query string." },
    });
  });
});
