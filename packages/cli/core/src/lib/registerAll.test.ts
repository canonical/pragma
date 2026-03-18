import { Command } from "commander";
import { describe, expect, it } from "vitest";
import createExitResult from "./createExitResult.js";
import createOutputResult from "./createOutputResult.js";
import registerAll, {
  convertParameterToFlag,
  extractParams,
} from "./registerAll.js";
import type {
  CommandContext,
  CommandDefinition,
  ParameterDefinition,
} from "./types.js";

const testCtx: CommandContext = {
  cwd: "/test",
  globalFlags: { llm: false, format: "text", verbose: false },
};

describe("registerAll", () => {
  describe("convertParameterToFlag", () => {
    it("produces --flag for boolean", () => {
      const param: ParameterDefinition = {
        name: "detailed",
        description: "Details",
        type: "boolean",
      };
      expect(convertParameterToFlag(param)).toBe("--detailed");
    });

    it("produces --flag <value> for string", () => {
      const param: ParameterDefinition = {
        name: "category",
        description: "Category filter",
        type: "string",
      };
      expect(convertParameterToFlag(param)).toBe("--category <value>");
    });

    it("produces --flag <value> for select", () => {
      const param: ParameterDefinition = {
        name: "framework",
        description: "Framework",
        type: "select",
        choices: [{ label: "React", value: "react" }],
      };
      expect(convertParameterToFlag(param)).toBe("--framework <value>");
    });

    it("produces --flag <values...> for multiselect", () => {
      const param: ParameterDefinition = {
        name: "aspects",
        description: "Aspects",
        type: "multiselect",
      };
      expect(convertParameterToFlag(param)).toBe("--aspects <values...>");
    });

    it("converts camelCase name to kebab-case", () => {
      const param: ParameterDefinition = {
        name: "allTiers",
        description: "Include all tiers",
        type: "boolean",
      };
      expect(convertParameterToFlag(param)).toBe("--all-tiers");
    });
  });

  describe("extractParams", () => {
    it("extracts option values by parameter name", () => {
      const params: ParameterDefinition[] = [
        { name: "detailed", description: "Details", type: "boolean" },
        { name: "category", description: "Category", type: "string" },
      ];

      const opts = { detailed: true, category: "react" };
      const result = extractParams(opts, [], params);

      expect(result).toEqual({ detailed: true, category: "react" });
    });

    it("applies default values for missing options", () => {
      const params: ParameterDefinition[] = [
        {
          name: "detailed",
          description: "Details",
          type: "boolean",
          default: false,
        },
      ];

      const result = extractParams({}, [], params);
      expect(result).toEqual({ detailed: false });
    });

    it("maps positional arguments", () => {
      const params: ParameterDefinition[] = [
        {
          name: "name",
          description: "Component name",
          type: "string",
          positional: true,
        },
      ];

      const result = extractParams({}, ["Button"], params);
      expect(result).toEqual({ name: "Button" });
    });

    it("combines options and positional args", () => {
      const params: ParameterDefinition[] = [
        {
          name: "name",
          description: "Component name",
          type: "string",
          positional: true,
        },
        {
          name: "detailed",
          description: "Details",
          type: "boolean",
        },
      ];

      const result = extractParams({ detailed: true }, ["Button"], params);
      expect(result).toEqual({ name: "Button", detailed: true });
    });

    it("ignores undefined options without defaults", () => {
      const params: ParameterDefinition[] = [
        { name: "category", description: "Category", type: "string" },
      ];

      const result = extractParams({}, [], params);
      expect(result).toEqual({});
    });
  });

  describe("registerAll", () => {
    it("registers a single-segment command", () => {
      const commands: CommandDefinition[] = [
        {
          path: ["info"],
          description: "Show info",
          parameters: [],
          execute: async () => createExitResult(0),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const sub = program.commands.find((c) => c.name() === "info");
      expect(sub).toBeDefined();
      expect(sub?.description()).toBe("Show info");
    });

    it("registers multi-segment commands under a noun parent", () => {
      const commands: CommandDefinition[] = [
        {
          path: ["component", "list"],
          description: "List components",
          parameters: [],
          execute: async () => createExitResult(0),
        },
        {
          path: ["component", "get"],
          description: "Get component",
          parameters: [
            {
              name: "name",
              description: "Component name",
              type: "string",
              positional: true,
              required: true,
            },
          ],
          execute: async () => createExitResult(0),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const noun = program.commands.find((c) => c.name() === "component");
      expect(noun).toBeDefined();
      expect(noun?.commands).toHaveLength(2);

      const list = noun?.commands.find((c) => c.name() === "list");
      expect(list?.description()).toBe("List components");

      const get = noun?.commands.find((c) => c.name() === "get");
      expect(get?.description()).toBe("Get component");
    });

    it("registers boolean options on commands", () => {
      const commands: CommandDefinition[] = [
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
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const noun = program.commands.find((c) => c.name() === "component");
      const list = noun?.commands.find((c) => c.name() === "list");
      const opts = list?.options ?? [];
      const allTiersOpt = opts.find((o) => o.long === "--all-tiers");
      expect(allTiersOpt).toBeDefined();
    });

    it("groups commands from different domains", () => {
      const commands: CommandDefinition[] = [
        {
          path: ["component", "list"],
          description: "List components",
          parameters: [],
          execute: async () => createExitResult(0),
        },
        {
          path: ["standard", "list"],
          description: "List standards",
          parameters: [],
          execute: async () => createExitResult(0),
        },
        {
          path: ["info"],
          description: "Show info",
          parameters: [],
          execute: async () => createExitResult(0),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const names = program.commands.map((c) => c.name()).sort();
      expect(names).toEqual(["component", "info", "standard"]);
    });

    it("skips commands with empty path", () => {
      const commands: CommandDefinition[] = [
        {
          path: [],
          description: "Invalid",
          parameters: [],
          execute: async () => createExitResult(0),
        },
      ];

      const program = new Command();
      registerAll(program, commands, testCtx);
      expect(program.commands).toHaveLength(0);
    });

    it("wires execute handler that calls command execute", async () => {
      let captured: Record<string, unknown> = {};

      const commands: CommandDefinition[] = [
        {
          path: ["test"],
          description: "Test command",
          parameters: [
            {
              name: "verbose",
              description: "Verbose output",
              type: "boolean",
            },
          ],
          execute: async (params) => {
            captured = params;
            return createExitResult(0);
          },
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      await program.parseAsync(["test", "--verbose"], {
        from: "user",
      });
      expect(captured).toEqual({ verbose: true });
    });

    it("handles output result by writing to stdout", async () => {
      const commands: CommandDefinition[] = [
        {
          path: ["echo"],
          description: "Echo test",
          parameters: [],
          execute: async () => createOutputResult("hello", { plain: (s) => s }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const chunks: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        chunks.push(chunk);
        return true;
      }) as typeof process.stdout.write;

      try {
        await program.parseAsync(["echo"], { from: "user" });
      } finally {
        process.stdout.write = originalWrite;
      }

      expect(chunks.join("")).toContain("hello");
    });
  });
});
