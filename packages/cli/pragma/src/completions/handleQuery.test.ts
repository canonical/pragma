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
      path: ["block", "list"],
      description: "List blocks",
      parameters: [],
      execute: async () => createExitResult(0),
    },
    {
      path: ["block", "get"],
      description: "Get block details",
      parameters: [
        {
          name: "name",
          description: "Block name",
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
        {
          name: "detailed",
          description: "Show full detail",
          type: "boolean",
        },
        {
          name: "anatomyOnly",
          description: "Show anatomy only",
          type: "boolean",
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
    expect(result).toBe("block\nstandard");
  });

  it("returns filtered nouns for partial input", async () => {
    const result = await handleQuery("blo", makeTree(), ctx);
    expect(result).toBe("block");
  });

  it("returns all verbs when noun is complete with trailing space", async () => {
    const result = await handleQuery("block ", makeTree(), ctx);
    expect(result).toBe("get\nlist");
  });

  it("returns filtered verbs for partial verb", async () => {
    const result = await handleQuery("block g", makeTree(), ctx);
    expect(result).toBe("get");
  });

  it("invokes level 3 completer for argument completion", async () => {
    const result = await handleQuery("block get Bu", makeTree(), ctx);
    expect(result).toBe("Button");
  });

  it("returns all level 3 candidates for empty argument partial", async () => {
    const result = await handleQuery("block get ", makeTree(), ctx);
    expect(result).toBe("Button\nCard\nModal");
  });

  it("returns empty string for unknown noun", async () => {
    const result = await handleQuery("unknown verb", makeTree(), ctx);
    expect(result).toBe("");
  });

  it("returns empty string for verb with no completers", async () => {
    const result = await handleQuery("block list something", makeTree(), ctx);
    expect(result).toBe("");
  });

  it("strips the leading program name shells forward", async () => {
    // Every generated shell script forwards the full command line, so the
    // program name arrives as the first word.
    const result = await handleQuery("pragma blo", makeTree(), ctx);
    expect(result).toBe("block");
  });

  it("lists nouns when only the program name is present", async () => {
    const result = await handleQuery("pragma", makeTree(), ctx);
    expect(result).toBe("block\nstandard");
  });

  it("completes verb flags when the word starts with a dash", async () => {
    const result = await handleQuery("block get --", makeTree(), ctx);
    expect(result).toBe("--anatomy-only\n--detailed");
  });

  it("filters verb flags by the dash-prefixed partial", async () => {
    const result = await handleQuery("block get --d", makeTree(), ctx);
    expect(result).toBe("--detailed");
  });
});
