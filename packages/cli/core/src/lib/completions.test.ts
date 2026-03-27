import { describe, expect, it } from "vitest";
import { buildCompleters, resolveCompletion } from "./completions/index.js";
import createExitResult from "./createExitResult.js";
import type {
  CommandContext,
  CommandDefinition,
  CompletionTree,
} from "./types.js";

const testCtx: CommandContext = {
  cwd: "/test",
  globalFlags: { llm: false, format: "text", verbose: false },
};

function makeCommands(): CommandDefinition[] {
  return [
    {
      path: ["component", "list"],
      description: "List components",
      parameters: [
        {
          name: "allTiers",
          description: "Include all tiers",
          type: "boolean",
        },
      ],
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
            const names = ["Button", "Card", "Modal", "Tooltip"];
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
    {
      path: ["standard", "get"],
      description: "Get standard details",
      parameters: [
        {
          name: "name",
          description: "Standard name",
          type: "string",
          positional: true,
          required: true,
        },
      ],
      execute: async () => createExitResult(0),
    },
    {
      path: ["config", "channel"],
      description: "Set channel",
      parameters: [
        {
          name: "value",
          description: "Channel value",
          type: "select",
          positional: true,
          choices: [
            { label: "Normal", value: "normal" },
            { label: "Experimental", value: "experimental" },
            { label: "Prerelease", value: "prerelease" },
          ],
        },
      ],
      execute: async () => createExitResult(0),
    },
  ];
}

describe("completions", () => {
  describe("buildCompleters", () => {
    it("builds tree with correct noun entries", () => {
      const tree = buildCompleters(makeCommands());

      expect(tree.nouns.has("component")).toBe(true);
      expect(tree.nouns.has("standard")).toBe(true);
      expect(tree.nouns.has("config")).toBe(true);
    });

    it("builds verb entries under each noun", () => {
      const tree = buildCompleters(makeCommands());

      const component = tree.nouns.get("component");
      expect(component?.verbs.has("list")).toBe(true);
      expect(component?.verbs.has("get")).toBe(true);
    });

    it("extracts complete function as completer", () => {
      const tree = buildCompleters(makeCommands());

      const component = tree.nouns.get("component");
      const get = component?.verbs.get("get");
      expect(get?.completers).toHaveLength(1);
    });

    it("creates static completer from choices", () => {
      const tree = buildCompleters(makeCommands());

      const config = tree.nouns.get("config");
      const channel = config?.verbs.get("channel");
      expect(channel?.completers).toHaveLength(1);
    });

    it("no completers for commands without complete or choices", () => {
      const tree = buildCompleters(makeCommands());

      const component = tree.nouns.get("component");
      const list = component?.verbs.get("list");
      expect(list?.completers).toHaveLength(0);
    });

    it("skips commands with empty path", () => {
      const tree = buildCompleters([
        {
          path: [],
          description: "Invalid",
          parameters: [],
          execute: async () => createExitResult(0),
        },
      ]);

      expect(tree.nouns.size).toBe(0);
    });
  });

  describe("resolveCompletion", () => {
    let tree: CompletionTree;

    it("resolves level 1 for empty input", async () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, [""]);

      expect(result.level).toBe(1);
      expect(result.partial).toBe("");
      expect(result.completer).toBeDefined();

      const candidates = await result.completer?.("", testCtx);
      expect(candidates).toEqual(["component", "config", "standard"]);
    });

    it("resolves level 1 with partial noun", async () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, ["com"]);

      expect(result.level).toBe(1);
      expect(result.partial).toBe("com");

      const candidates = await result.completer?.("com", testCtx);
      expect(candidates).toEqual(["component"]);
    });

    it("resolves level 2 for complete noun + partial verb", async () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, ["component", "li"]);

      expect(result.level).toBe(2);
      expect(result.partial).toBe("li");

      const candidates = await result.completer?.("li", testCtx);
      expect(candidates).toEqual(["list"]);
    });

    it("resolves level 2 listing all verbs for empty partial", async () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, ["component", ""]);

      expect(result.level).toBe(2);

      const candidates = await result.completer?.("", testCtx);
      expect(candidates).toEqual(["get", "list"]);
    });

    it("resolves level 3 for complete noun + verb + partial arg", async () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, ["component", "get", "Bu"]);

      expect(result.level).toBe(3);
      expect(result.partial).toBe("Bu");

      const candidates = await result.completer?.("Bu", testCtx);
      expect(candidates).toEqual(["Button"]);
    });

    it("resolves level 3 with choices-based completer", async () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, ["config", "channel", "exp"]);

      expect(result.level).toBe(3);
      expect(result.partial).toBe("exp");

      const candidates = await result.completer?.("exp", testCtx);
      expect(candidates).toEqual(["experimental"]);
    });

    it("returns undefined completer for unknown noun", () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, ["unknown", "verb"]);

      expect(result.completer).toBeUndefined();
    });

    it("returns undefined completer for verb with no arg completers", () => {
      tree = buildCompleters(makeCommands());
      const result = resolveCompletion(tree, [
        "component",
        "list",
        "something",
      ]);

      expect(result.level).toBe(3);
      expect(result.completer).toBeUndefined();
    });
  });
});
