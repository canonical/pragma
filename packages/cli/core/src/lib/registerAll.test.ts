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

    it("produces --flag for a boolean defaulting to false", () => {
      const param: ParameterDefinition = {
        name: "detailed",
        description: "Details",
        type: "boolean",
        default: false,
      };
      expect(convertParameterToFlag(param)).toBe("--detailed");
    });

    it("produces --no-flag for a boolean defaulting to true", () => {
      const param: ParameterDefinition = {
        name: "withStyles",
        description: "Include styles",
        type: "boolean",
        default: true,
      };
      expect(convertParameterToFlag(param)).toBe("--no-with-styles");
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

    it("prepends a short flag when `short` is set", () => {
      const param: ParameterDefinition = {
        name: "follow",
        description: "Follow output",
        type: "boolean",
        short: "f",
      };
      expect(convertParameterToFlag(param)).toBe("-f, --follow");
    });

    it("prepends a short flag for value-taking flags", () => {
      const param: ParameterDefinition = {
        name: "output",
        description: "Output path",
        type: "string",
        short: "o",
      };
      expect(convertParameterToFlag(param)).toBe("-o, --output <value>");
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

    it("captures trailing positional multiselect values", () => {
      const params: ParameterDefinition[] = [
        {
          name: "names",
          description: "Component names",
          type: "multiselect",
          positional: true,
        },
      ];

      const result = extractParams({}, ["Button", "Card"], params);
      expect(result).toEqual({ names: ["Button", "Card"] });
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

    it("reuses existing parent when single and multi-segment commands share a noun", () => {
      const commands: CommandDefinition[] = [
        {
          path: ["component"],
          description: "Component root",
          parameters: [],
          execute: async () => createExitResult(0),
        },
        {
          path: ["component", "list"],
          description: "List components",
          parameters: [],
          execute: async () => createExitResult(0),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const noun = program.commands.find((c) => c.name() === "component");
      expect(noun).toBeDefined();
      const list = noun?.commands.find((c) => c.name() === "list");
      expect(list?.description()).toBe("List components");
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

    it("propagates a non-zero exit result to process.exitCode", async () => {
      // The exit tag is the sole channel through which executeGenerator's
      // exit 3 (non-interactive, missing flags) and exit 130 (Ctrl-C) reach
      // the process status. Assert the dispatcher actually applies the code,
      // not just that the command returns it.
      const commands: CommandDefinition[] = [
        {
          path: ["fail"],
          description: "Exits non-zero",
          parameters: [],
          execute: async () => createExitResult(3),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const originalExitCode = process.exitCode;
      process.exitCode = 0;
      try {
        await program.parseAsync(["fail"], { from: "user" });
        expect(process.exitCode).toBe(3);
      } finally {
        process.exitCode = originalExitCode;
      }
    });

    it("accepts multiple positional args for trailing multiselect params", async () => {
      let captured: Record<string, unknown> = {};

      const commands: CommandDefinition[] = [
        {
          path: ["token", "lookup"],
          description: "Lookup tokens",
          parameters: [
            {
              name: "names",
              description: "Token names",
              type: "multiselect",
              positional: true,
              required: true,
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

      await program.parseAsync(
        ["token", "lookup", "color.primary", "spacing.sm"],
        {
          from: "user",
        },
      );

      expect(captured).toEqual({ names: ["color.primary", "spacing.sm"] });
    });

    it("writes output in chunks when text exceeds 4096 bytes", async () => {
      const largeText = "x".repeat(5000);
      const commands: CommandDefinition[] = [
        {
          path: ["large"],
          description: "Large output",
          parameters: [],
          execute: async () =>
            createOutputResult(largeText, { plain: (s) => s }),
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
        await program.parseAsync(["large"], { from: "user" });
      } finally {
        process.stdout.write = originalWrite;
      }

      // Multiple chunks: text was split
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join("")).toContain(largeText);
    });

    it("does not write to stdout when plain render returns empty", async () => {
      const commands: CommandDefinition[] = [
        {
          path: ["empty"],
          description: "Empty output",
          parameters: [],
          execute: async () => createOutputResult(null, { plain: () => "" }),
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
        await program.parseAsync(["empty"], { from: "user" });
      } finally {
        process.stdout.write = originalWrite;
      }

      expect(chunks).toHaveLength(0);
    });

    it("uses ink renderer when mode is ink and render.ink is available", async () => {
      let inkCalled = false;
      const commands: CommandDefinition[] = [
        {
          path: ["ink-test"],
          description: "Ink test",
          parameters: [],
          execute: async () =>
            createOutputResult("data", {
              plain: (s) => s,
              ink: () => "ink-element" as unknown as React.ReactElement,
            }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx, {
        mode: "ink",
        renderInk: async () => {
          inkCalled = true;
        },
      });

      await program.parseAsync(["ink-test"], { from: "user" });
      expect(inkCalled).toBe(true);
    });

    it("renders noun-level help when --help is passed for a noun", async () => {
      const commands: CommandDefinition[] = [
        {
          path: ["component", "list"],
          description: "List components",
          parameters: [],
          execute: async () => createExitResult(0),
        },
      ];

      const program = new Command();
      program.name("pragma");
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stdoutChunks: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        stdoutChunks.push(chunk);
        return true;
      }) as typeof process.stdout.write;

      try {
        await program.parseAsync(["component", "--help"], {
          from: "user",
        });
      } catch {
        // Commander throws on --help with exitOverride
      } finally {
        process.stdout.write = originalWrite;
      }

      const output = stdoutChunks.join("");
      expect(output).toContain("Usage: pragma component");
      expect(output).toContain("list");
    });

    it("renders verb-level help when --help is passed for a verb", async () => {
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
      program.name("pragma");
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stdoutChunks: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        stdoutChunks.push(chunk);
        return true;
      }) as typeof process.stdout.write;

      try {
        await program.parseAsync(["component", "list", "--help"], {
          from: "user",
        });
      } catch {
        // Commander throws on --help with exitOverride
      } finally {
        process.stdout.write = originalWrite;
      }

      const output = stdoutChunks.join("");
      expect(output).toContain("Usage: pragma component list");
      expect(output).toContain("--all-tiers");
    });

    it("passes single positional string argument to execute handler", async () => {
      let captured: Record<string, unknown> = {};

      const commands: CommandDefinition[] = [
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
          execute: async (params) => {
            captured = params;
            return createExitResult(0);
          },
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      await program.parseAsync(["component", "get", "Button"], {
        from: "user",
      });

      expect(captured).toEqual({ name: "Button" });
    });

    it("handles options with defaults", async () => {
      let captured: Record<string, unknown> = {};

      const commands: CommandDefinition[] = [
        {
          path: ["defaulted"],
          description: "Defaulted",
          parameters: [
            {
              name: "count",
              description: "Count",
              type: "string",
              default: "10",
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

      await program.parseAsync(["defaulted"], { from: "user" });
      expect(captured).toEqual({ count: "10" });
    });

    it("invokes an action with an optional positional and a flag", async () => {
      let captured: Record<string, unknown> = {};

      const commands: CommandDefinition[] = [
        {
          path: ["make"],
          description: "Make a thing",
          parameters: [
            {
              name: "target",
              description: "Target",
              type: "string",
              positional: true,
            },
            { name: "loud", description: "Loud", type: "boolean" },
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

      await program.parseAsync(["make", "widget", "--loud"], { from: "user" });
      expect(captured).toEqual({ target: "widget", loud: true });
    });

    it("skips an omitted optional positional argument in the action", async () => {
      let captured: Record<string, unknown> | undefined;

      const commands: CommandDefinition[] = [
        {
          path: ["make"],
          description: "Make a thing",
          parameters: [
            {
              name: "target",
              description: "Target",
              type: "string",
              positional: true,
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

      // Omitting the optional positional passes `undefined` to the action,
      // which the arg loop skips (it is neither string, array, Command, nor
      // a non-null object).
      await program.parseAsync(["make"], { from: "user" });
      expect(captured).toEqual({});
    });
  });
});
