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
  it("returns all expected command paths", () => {
    const commands = collectCommands(makeCtx());
    const paths = commands.map((command) => command.path.join(" "));

    expect(paths).toHaveLength(30);

    expect(paths).toContain("config tier");
    expect(paths).toContain("config channel");
    expect(paths).toContain("config show");
    expect(paths).toContain("create component");
    expect(paths).toContain("create package");
    expect(paths).toContain("setup all");
    expect(paths).toContain("setup lsp");
    expect(paths).toContain("setup mcp");
    expect(paths).toContain("setup completions");
    expect(paths).toContain("setup skills");
    expect(paths).toContain("standard list");
    expect(paths).toContain("standard lookup");
    expect(paths).toContain("standard categories");
    expect(paths).toContain("modifier list");
    expect(paths).toContain("modifier lookup");
    expect(paths).toContain("tier list");
    expect(paths).toContain("token list");
    expect(paths).toContain("token lookup");
    expect(paths).toContain("tokens add-config");
    expect(paths).toContain("block list");
    expect(paths).toContain("block lookup");
    expect(paths).toContain("ontology list");
    expect(paths).toContain("ontology show");
    expect(paths).toContain("graph query");
    expect(paths).toContain("graph inspect");
    expect(paths).toContain("skill list");
    expect(paths).toContain("doctor");
    expect(paths).toContain("info");
    expect(paths).toContain("upgrade");
    expect(paths).toContain("llm");
  });
});
