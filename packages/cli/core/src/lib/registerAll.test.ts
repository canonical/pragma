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
  CommandResult,
  InteractiveSpec,
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

    it("delegates interactive results to the context interactive handler", async () => {
      const commands: CommandDefinition[] = [
        {
          path: ["scaffold"],
          description: "Scaffold something",
          parameters: [],
          execute: async () => ({
            tag: "interactive",
            spec: {
              generator: {
                meta: { name: "gen", version: "1.0.0" },
                prompts: [],
                generate: () => undefined,
              },
              partialAnswers: {},
              options: {
                dryRunOnly: false,
                undo: false,
                verbose: false,
                stamp: undefined,
                preview: true,
              },
            },
          }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, {
        ...testCtx,
        interactive: async () =>
          createOutputResult("interactive handled", { plain: (s) => s }),
      });

      const chunks: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        chunks.push(chunk);
        return true;
      }) as typeof process.stdout.write;

      try {
        await program.parseAsync(["scaffold"], { from: "user" });
      } finally {
        process.stdout.write = originalWrite;
      }

      expect(chunks.join("")).toContain("interactive handled");
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

    it("writes stderr and sets exit code 3 when interactive handler is unavailable", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [
            {
              name: "componentPath",
              type: "text",
              message: "Path?",
            },
          ],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold"],
          description: "Scaffold",
          parameters: [
            {
              name: "componentPath",
              description: "Path",
              type: "string",
              required: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      // No interactive handler → unavailable path
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      expect(stderrChunks.join("")).toContain("Interactive mode not available");
      expect(stderrChunks.join("")).toContain("--component-path");
      expect(stderrChunks.join("")).toContain("src/components/Button");
      expect(process.exitCode).toBe(3);
      process.exitCode = originalExitCode;
    });

    it("writes stderr when interactive handler returns null", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-null"],
          description: "Scaffold",
          parameters: [],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, {
        ...testCtx,
        interactive: async () => null as unknown as CommandResult,
      });

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-null"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      expect(stderrChunks.join("")).toContain("Interactive mode not available");
      expect(process.exitCode).toBe(3);
      process.exitCode = originalExitCode;
    });

    it("inferExampleScalar uses name-specific values", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [
            { name: "name", type: "text", message: "Name?" },
            { name: "description", type: "text", message: "Description?" },
            { name: "type", type: "text", message: "Type?" },
            { name: "unknown", type: "text", message: "Unknown?" },
          ],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-examples"],
          description: "Scaffold examples",
          parameters: [
            {
              name: "name",
              description: "Name",
              type: "string",
              required: true,
            },
            {
              name: "description",
              description: "Desc",
              type: "string",
              required: true,
            },
            {
              name: "type",
              description: "Type",
              type: "string",
              required: true,
            },
            {
              name: "unknown",
              description: "Other",
              type: "string",
              required: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-examples"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      expect(output).toContain("@canonical/example-package");
      expect(output).toContain("Example package");
      expect(output).toContain("tool-ts");
      expect(output).toContain("<unknown>");
      process.exitCode = originalExitCode;
    });

    it("inferExampleValue for multiselect produces array", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [
            {
              name: "items",
              type: "multiselect",
              message: "Items?",
              choices: [
                { label: "A", value: "a" },
                { label: "B", value: "b" },
              ],
            },
          ],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-multi"],
          description: "Scaffold multi",
          parameters: [
            {
              name: "items",
              description: "Items",
              type: "multiselect",
              required: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-multi"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      expect(output).toContain("--items");
      process.exitCode = originalExitCode;
    });

    it("inferExampleValue for boolean in non-positional uses flag", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [{ name: "confirm", type: "confirm", message: "Continue?" }],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-bool"],
          description: "Scaffold bool",
          parameters: [
            {
              name: "confirm",
              description: "Continue?",
              type: "boolean",
              required: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-bool"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      expect(output).toContain("--confirm");
      process.exitCode = originalExitCode;
    });

    it("interactive unavailable with no missing params shows generic message", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [
            { name: "x", type: "text", message: "X?", default: "default" },
          ],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-defaults"],
          description: "Scaffold defaults",
          parameters: [],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-defaults"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      expect(stderrChunks.join("")).toContain("Provide all required flags");
      process.exitCode = originalExitCode;
    });

    it("interactive shows partial answers in example", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [
            { name: "name", type: "text", message: "Name?" },
            { name: "type", type: "text", message: "Type?" },
          ],
          generate: () => undefined,
        },
        partialAnswers: { name: "my-component" },
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-partial"],
          description: "Scaffold",
          parameters: [
            { name: "name", description: "Name", type: "string" },
            {
              name: "type",
              description: "Type",
              type: "string",
              required: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-partial"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      expect(output).toContain("--name");
      expect(output).toContain("my-component");
      process.exitCode = originalExitCode;
    });

    it("interactive shows positional parameter usage in missing flags", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [{ name: "name", type: "text", message: "Name?" }],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-pos"],
          description: "Scaffold",
          parameters: [
            {
              name: "name",
              description: "Name",
              type: "string",
              positional: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-pos"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      expect(output).toContain("[name]");
      expect(output).toContain("@canonical/example-package");
      process.exitCode = originalExitCode;
    });

    it("handles missing positional boolean parameter in example (true+positional)", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [
            { name: "flag", type: "confirm", message: "Flag?" },
            { name: "name", type: "text", message: "Name?" },
          ],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-posbool-missing"],
          description: "Scaffold",
          parameters: [
            {
              name: "flag",
              description: "Flag",
              type: "boolean",
              positional: true,
            },
            {
              name: "name",
              description: "Name",
              type: "string",
              required: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-posbool-missing"], {
          from: "user",
        });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      // boolean true + positional → inferExampleValue returns true, but
      // formatParameterExample returns [] for boolean positional with value=true
      expect(output).toContain("Missing required flags");
      expect(output).toContain("--name");
      process.exitCode = originalExitCode;
    });

    it("handles positional boolean parameter in example", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [{ name: "flag", type: "confirm", message: "Flag?" }],
          generate: () => undefined,
        },
        partialAnswers: { flag: false },
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-posbool"],
          description: "Scaffold",
          parameters: [
            {
              name: "flag",
              description: "Flag",
              type: "boolean",
              positional: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-posbool"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      // boolean false + positional → no args generated
      expect(stderrChunks.join("")).toContain("Provide all required flags");
      process.exitCode = originalExitCode;
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

    it("formatInteractiveUnavailableMessage with no cmd returns generic message", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [{ name: "name", type: "text", message: "Name?" }],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      // cmd=undefined, ctx has no interactive handler, and handleResult's
      // cmd parameter is undefined → exercises findMissingInteractiveParameters(!cmd)
      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-nocmd"],
          description: "Scaffold",
          parameters: [],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-nocmd"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      // The spec has a prompt "name" but the command has no parameters matching it,
      // so findMissingInteractiveParameters returns [] (prompt doesn't match any parameter)
      // and missing.length === 0 → generic "Provide all required flags" message
      expect(output).toContain("Provide all required flags");
      process.exitCode = originalExitCode;
    });

    it("interactive skips prompts that do not match any command parameter", async () => {
      const spec: InteractiveSpec = {
        generator: {
          meta: { name: "gen", version: "1.0.0" },
          prompts: [
            { name: "unknownParam", type: "text", message: "Unknown?" },
          ],
          generate: () => undefined,
        },
        partialAnswers: {},
        options: {
          dryRunOnly: false,
          undo: false,
          verbose: false,
          stamp: undefined,
          preview: true,
        },
      };

      const commands: CommandDefinition[] = [
        {
          path: ["scaffold-unknown"],
          description: "Scaffold",
          parameters: [
            {
              name: "realParam",
              description: "Real",
              type: "string",
              required: true,
            },
          ],
          execute: async () => ({ tag: "interactive" as const, spec }),
        },
      ];

      const program = new Command();
      program.exitOverride();
      registerAll(program, commands, testCtx);

      const stderrChunks: string[] = [];
      const originalStderr = process.stderr.write;
      const originalExitCode = process.exitCode;
      process.stderr.write = ((chunk: string) => {
        stderrChunks.push(chunk);
        return true;
      }) as typeof process.stderr.write;

      try {
        await program.parseAsync(["scaffold-unknown"], { from: "user" });
      } finally {
        process.stderr.write = originalStderr;
      }

      const output = stderrChunks.join("");
      // Prompt "unknownParam" doesn't match any command parameter →
      // parameter is undefined → returns [] from flatMap, so missing is empty.
      // This triggers the generic message since missing.length === 0
      expect(output).toContain("Provide all required flags");
      process.exitCode = originalExitCode;
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
  });
});
