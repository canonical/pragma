import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaContext } from "../domains/shared/context.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import createTestRuntime from "../testing/helpers/createTestRuntime.js";
import collectCommands from "./collectCommands.js";

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

describe("collectCommands", () => {
  it("includes block, ontology, and graph command paths", () => {
    const commands = collectCommands(makeCtx());
    const paths = commands.map((command) => command.path.join(" "));

    expect(paths).toContain("block list");
    expect(paths).toContain("block get");
    expect(paths).toContain("ontology list");
    expect(paths).toContain("ontology show");
    expect(paths).toContain("graph query");
    expect(paths).toContain("graph inspect");
  });
});
