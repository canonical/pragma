import { pure, task } from "@canonical/task";
import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import registerGeneratorCommands, {
  type GeneratorCliHost,
  splitGeneratorActionArgs,
} from "./registerGeneratorCommand.js";
import type { CommandEntry } from "./types.js";

/** A minimal generator with an optional positional prompt. */
function makeGenerator(
  name: string,
  { positional = false }: { positional?: boolean } = {},
): GeneratorDefinition {
  return {
    meta: {
      name,
      displayName: name,
      description: `${name} generator`,
      version: "0.0.1",
    },
    prompts: [
      ...(positional
        ? [
            {
              name: "componentPath",
              type: "text" as const,
              message: "Component path:",
              positional: true,
            },
          ]
        : []),
      {
        name: "withStyles",
        type: "confirm" as const,
        message: "Styles?",
        default: true,
      },
    ],
    generate: () => task(pure(undefined)).unwrap(),
  };
}

/** A recording host with summon-shaped standard flags. */
function makeHost(): {
  host: GeneratorCliHost;
  calls: Array<{
    entry: CommandEntry;
    positionalValue: string | undefined;
    options: Record<string, unknown>;
  }>;
  namespaces: string[];
} {
  const calls: Array<{
    entry: CommandEntry;
    positionalValue: string | undefined;
    options: Record<string, unknown>;
  }> = [];
  const namespaces: string[] = [];
  const host: GeneratorCliHost = {
    standardFlags: {
      register: (cmd) => {
        cmd.option("-y, --yes", "Skip confirmation prompts");
      },
      help: [{ flags: "-y, --yes", description: "Skip confirmation prompts" }],
    },
    action: async (entry, positionalValue, options) => {
      calls.push({ entry, positionalValue, options });
    },
    onNamespace: (cmd) => {
      namespaces.push(cmd.name());
    },
  };
  return { host, calls, namespaces };
}

function makeProgram(): Command {
  const program = new Command("bin");
  program.exitOverride();
  program.configureOutput({ writeErr: () => {}, writeOut: () => {} });
  return program;
}

describe("registerGeneratorCommands", () => {
  it("registers a leaf with prompt options, standard flags, and usage", async () => {
    const program = makeProgram();
    const { host, calls } = makeHost();
    const generator = makeGenerator("widget", { positional: true });
    registerGeneratorCommands(program, [{ path: ["widget"], generator }], host);

    const cmd = program.commands.find((c) => c.name() === "widget");
    expect(cmd?.description()).toBe("widget generator");
    expect(cmd?.usage()).toBe("[component-path] [options]");

    await program.parseAsync(
      ["widget", "src/components/X", "--no-with-styles", "--yes"],
      { from: "user" },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.positionalValue).toBe("src/components/X");
    expect(calls[0]?.options).toMatchObject({ withStyles: false, yes: true });
    expect(calls[0]?.entry.path).toEqual(["widget"]);
  });

  it("a leaf without a positional gets a bare command spec", async () => {
    const program = makeProgram();
    const { host, calls } = makeHost();
    registerGeneratorCommands(
      program,
      [{ path: ["pkg"], generator: makeGenerator("pkg") }],
      host,
    );
    const cmd = program.commands.find((c) => c.name() === "pkg");
    expect(cmd?.usage()).toBe("[options]"); // Commander default
    await program.parseAsync(["pkg"], { from: "user" });
    expect(calls[0]?.positionalValue).toBeUndefined();
  });

  it("creates namespace parents (declared or fallback description) and nests children", async () => {
    const program = makeProgram();
    const { host, calls, namespaces } = makeHost();
    registerGeneratorCommands(
      program,
      [
        { path: ["component"], description: "component generators" },
        { path: ["ns"] },
        {
          path: ["component", "react"],
          generator: makeGenerator("component/react", { positional: true }),
        },
      ],
      host,
    );
    const componentCmd = program.commands.find((c) => c.name() === "component");
    expect(componentCmd?.description()).toBe("component generators");
    expect(program.commands.find((c) => c.name() === "ns")?.description()).toBe(
      "ns commands",
    );
    expect(namespaces).toEqual(["component", "ns"]);

    await program.parseAsync(["component", "react", "lib/X"], {
      from: "user",
    });
    expect(calls[0]?.entry.path).toEqual(["component", "react"]);
    expect(calls[0]?.positionalValue).toBe("lib/X");
  });

  it("a child whose parent entry is missing attaches to the root", async () => {
    const program = makeProgram();
    const { host, calls } = makeHost();
    registerGeneratorCommands(
      program,
      [{ path: ["orphan", "leaf"], generator: makeGenerator("leaf") }],
      host,
    );
    // No "orphan" parent was created; the leaf registers directly on the root.
    await program.parseAsync(["leaf"], { from: "user" });
    expect(calls).toHaveLength(1);
  });

  it("a runnable entry at an existing path configures the existing command", async () => {
    const program = makeProgram();
    const { host, calls } = makeHost();
    registerGeneratorCommands(
      program,
      [
        { path: ["dual"], description: "dual generators" },
        { path: ["dual"], generator: makeGenerator("dual") },
      ],
      host,
    );
    expect(program.commands.filter((c) => c.name() === "dual")).toHaveLength(1);
    await program.parseAsync(["dual", "--no-with-styles"], { from: "user" });
    expect(calls[0]?.options).toMatchObject({ withStyles: false });
  });

  it("a duplicate namespace entry at an existing path is skipped", () => {
    const program = makeProgram();
    const { host, namespaces } = makeHost();
    registerGeneratorCommands(
      program,
      [
        { path: ["dual"], generator: makeGenerator("dual") },
        { path: ["dual"], description: "again" },
      ],
      host,
    );
    expect(program.commands.filter((c) => c.name() === "dual")).toHaveLength(1);
    expect(namespaces).toEqual([]);
  });

  it("works without an onNamespace hook", () => {
    const program = makeProgram();
    const { host } = makeHost();
    const bare: GeneratorCliHost = {
      standardFlags: host.standardFlags,
      action: host.action,
    };
    registerGeneratorCommands(program, [{ path: ["ns"] }], bare);
    expect(program.commands.find((c) => c.name() === "ns")).toBeDefined();
  });

  it("grouped help surfaces the host's flag rows", () => {
    const program = makeProgram();
    const { host } = makeHost();
    const generator = makeGenerator("widget");
    generator.prompts[0] = { ...generator.prompts[0], group: "Options" };
    registerGeneratorCommands(program, [{ path: ["widget"], generator }], host);
    const cmd = program.commands.find((c) => c.name() === "widget");
    const help = cmd?.helpInformation() ?? "";
    expect(help).toContain("Global Options:");
    expect(help).toContain("-y, --yes");
    expect(help).toContain("Options:");
  });

  it("host action errors propagate through parseAsync", async () => {
    const program = makeProgram();
    const failing: GeneratorCliHost = {
      standardFlags: { register: vi.fn(), help: [] },
      action: async () => {
        throw new Error("host failed");
      },
    };
    registerGeneratorCommands(
      program,
      [{ path: ["x"], generator: makeGenerator("x") }],
      failing,
    );
    await expect(program.parseAsync(["x"], { from: "user" })).rejects.toThrow(
      "host failed",
    );
  });
});

describe("splitGeneratorActionArgs", () => {
  const options = { yes: true };

  it("with a declared positional: first arg is the value, second the options", () => {
    expect(splitGeneratorActionArgs(["v", options], true)).toEqual({
      positionalValue: "v",
      options,
    });
  });

  it("an omitted or empty positional yields undefined", () => {
    expect(
      splitGeneratorActionArgs([undefined, options], true).positionalValue,
    ).toBeUndefined();
    expect(
      splitGeneratorActionArgs(["", options], true).positionalValue,
    ).toBeUndefined();
  });

  it("without a positional: first arg is the options", () => {
    expect(splitGeneratorActionArgs([options], false)).toEqual({
      positionalValue: undefined,
      options,
    });
  });

  it("falls back to empty options when Commander passes none", () => {
    expect(splitGeneratorActionArgs([], false)).toEqual({
      positionalValue: undefined,
      options: {},
    });
    expect(splitGeneratorActionArgs(["v"], true)).toEqual({
      positionalValue: "v",
      options: {},
    });
  });
});
