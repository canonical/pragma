import type { CommandDefinition } from "@canonical/cli-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createTestRuntime from "../../../testing/helpers/createTestRuntime.js";
import type { PragmaContext } from "../../shared/context.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import type { OntologySummary } from "../../shared/types/index.js";
import buildListCommand from "./list.js";

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

describe("ontology list command", () => {
  it("returns ontology summaries", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { value } = await executeOutput(cmd, {}, ctx);

    const prefixes = (value as OntologySummary[]).map((item) => item.prefix);
    expect(prefixes).toContain("ds");
    expect(prefixes).toContain("cs");
  });

  it("renders plain output", async () => {
    const ctx = makeCtx();
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);

    expect(text).toContain("ds");
    expect(text).toContain("classes:");
    expect(text).toContain("anatomy:");
  });

  it("renders llm output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: true, format: "text" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);

    expect(text).toContain("## Ontologies");
    expect(text).toContain("**ds:**");
    expect(text).toContain("anatomy:");
  });

  it("renders json output", async () => {
    const ctx = makeCtx({
      globalFlags: { llm: false, format: "json" as const, verbose: false },
    });
    const cmd = buildListCommand(ctx);
    const { text } = await executeOutput(cmd, {}, ctx);

    const parsed = JSON.parse(text) as OntologySummary[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((item) => item.prefix === "ds")).toBe(true);
  });
});
