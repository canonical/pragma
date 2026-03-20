import type {
  CommandContext,
  CommandDefinition,
  CompletionTree,
} from "@canonical/cli-core";
import { buildCompleters, createExitResult } from "@canonical/cli-core";
import { describe, expect, it } from "vitest";
import handleQuery from "./handleQuery.js";

const ctx: CommandContext = {
  cwd: "/test",
  globalFlags: { llm: false, format: "text", verbose: false },
};

function makeTree(): CompletionTree {
  const commands: CommandDefinition[] = [
    {
      path: ["component", "list"],
      description: "List components",
      parameters: [],
      execute: async () => createExitResult(0),
    },
    {
      path: ["component", "get"],
      description: "Get component details",
      parameters: [
        {
          name: "name",
          description: "Component name",
          type: "string",
          positional: true,
          required: true,
          complete: async (partial) => {
            const names = ["Button", "Card", "Modal"];
            return names.filter((n) =>
              n.toLowerCase().startsWith(partial.toLowerCase()),
            );
          },
        },
      ],
      execute: async () => createExitResult(0),
    },
    {
      path: ["standard", "list"],
      description: "List standards",
      parameters: [],
      execute: async () => createExitResult(0),
    },
  ];
  return buildCompleters(commands);
}

describe("handleQuery", () => {
  it("returns all nouns for empty input", async () => {
    const result = await handleQuery("", makeTree(), ctx);
    expect(result).toBe("component\nstandard");
  });

  it("returns filtered nouns for partial input", async () => {
    const result = await handleQuery("com", makeTree(), ctx);
    expect(result).toBe("component");
  });

  it("returns all verbs when noun is complete with trailing space", async () => {
    const result = await handleQuery("component ", makeTree(), ctx);
    expect(result).toBe("get\nlist");
  });

  it("returns filtered verbs for partial verb", async () => {
    const result = await handleQuery("component g", makeTree(), ctx);
    expect(result).toBe("get");
  });

  it("invokes level 3 completer for argument completion", async () => {
    const result = await handleQuery("component get Bu", makeTree(), ctx);
    expect(result).toBe("Button");
  });

  it("returns all level 3 candidates for empty argument partial", async () => {
    const result = await handleQuery("component get ", makeTree(), ctx);
    expect(result).toBe("Button\nCard\nModal");
  });

  it("returns empty string for unknown noun", async () => {
    const result = await handleQuery("unknown verb", makeTree(), ctx);
    expect(result).toBe("");
  });

  it("returns empty string for verb with no completers", async () => {
    const result = await handleQuery(
      "component list something",
      makeTree(),
      ctx,
    );
    expect(result).toBe("");
  });
});
