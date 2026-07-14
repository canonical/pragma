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
    expect(paths).toContain("block lookup");
    expect(paths).toContain("ontology list");
    expect(paths).toContain("ontology show");
    expect(paths).toContain("graph query");
    expect(paths).toContain("graph inspect");
  });

  // Golden surface: the full built-in command set under default config (no
  // packs). The per-(noun, verb) reserved-guard flip must not add, drop, or
  // rename a single built-in command, so this list is byte-identical to the
  // pre-flip surface.
  it("has a stable built-in command surface", () => {
    const paths = collectCommands(makeCtx())
      .map((command) => command.path.join(" "))
      .sort();

    expect(paths).toEqual([
      "block list",
      "block lookup",
      "block sample",
      "capabilities",
      "config channel",
      "config framework",
      "config show",
      "config tier",
      "config trace",
      "create component",
      "create package",
      "doctor",
      "graph inspect",
      "graph query",
      "graphql build",
      "graphql check",
      "graphql serve",
      "info",
      "llm",
      "modifier list",
      "modifier lookup",
      "modifier sample",
      "ontology list",
      "ontology show",
      "setup all",
      "setup completions",
      "setup lsp",
      "setup mcp",
      "setup skills",
      "skill list",
      "skill lookup",
      "standard categories",
      "standard list",
      "standard lookup",
      "standard sample",
      "tier list",
      "token list",
      "token lookup",
      "token sample",
      "tokens add-config",
      "upgrade",
    ]);
  });
});
