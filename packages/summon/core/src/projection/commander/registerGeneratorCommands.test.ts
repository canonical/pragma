import { pure, task } from "@canonical/task";
import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import type { CommandEntry } from "../types.js";
import { renderUsageError } from "../usage.js";
import emitToProcess from "./emitToProcess.js";
import registerGeneratorCommands, {
  type CommanderHost,
  type MountOutcome,
  splitGeneratorActionArgs,
} from "./registerGeneratorCommands.js";

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

/** A recording host with summon-shaped standard flags and an outcome sink. */
function makeHost(): {
  host: CommanderHost;
  calls: Array<{
    entry: CommandEntry;
    positionalValue: string | undefined;
    options: Record<string, unknown>;
  }>;
  namespaces: string[];
  outcomes: MountOutcome[];
} {
  const calls: Array<{
    entry: CommandEntry;
    positionalValue: string | undefined;
    options: Record<string, unknown>;
  }> = [];
  const namespaces: string[] = [];
  const outcomes: MountOutcome[] = [];
  const host: CommanderHost = {
    registerFlags: (cmd) => {
      cmd.option("-y, --yes", "Skip confirmation prompts");
    },
    helpFlags: [
      { flags: "-y, --yes", description: "Skip confirmation prompts" },
    ],
    action: async (entry, positionalValue, options) => {
      calls.push({ entry, positionalValue, options });
    },
    onNamespace: (cmd) => {
      namespaces.push(cmd.name());
    },
    emit: (outcome) => {
      outcomes.push(outcome);
    },
  };
  return { host, calls, namespaces, outcomes };
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

  it("a runnable entry at an existing path configures the existing command — host flags included", async () => {
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
    // The upgraded command accepts the HOST's standard flags too — the
    // fresh-registration path calls host.registerFlags, and the upgrade
    // path must not lose it (`--yes` used to exit 2 as an unknown option
    // on a namespace+runnable path).
    await program.parseAsync(["dual", "--no-with-styles", "--yes"], {
      from: "user",
    });
    expect(calls[0]?.options).toMatchObject({ withStyles: false, yes: true });
  });

  it("a runnable entry with a positional at an existing path binds the positional", async () => {
    const program = makeProgram();
    const { host, calls } = makeHost();
    registerGeneratorCommands(
      program,
      [
        { path: ["dual"], description: "dual generators" },
        {
          path: ["dual"],
          generator: makeGenerator("dual", { positional: true }),
        },
      ],
      host,
    );
    const cmd = program.commands.find((c) => c.name() === "dual");
    // The namespace spec carried no positional, so the upgrade must declare
    // the argument (or Commander hands the action the options object where
    // the positional belongs) and print the leaf usage line.
    expect(cmd?.usage()).toBe("[component-path] [options]");
    await program.parseAsync(["dual", "src/components/X", "--yes"], {
      from: "user",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.positionalValue).toBe("src/components/X");
    expect(calls[0]?.options).toMatchObject({ yes: true });
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
    const bare: CommanderHost = {
      registerFlags: host.registerFlags,
      helpFlags: host.helpFlags,
      action: host.action,
      emit: host.emit,
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
    const failing: CommanderHost = {
      registerFlags: vi.fn(),
      helpFlags: [],
      action: async () => {
        throw new Error("host failed");
      },
      emit: vi.fn(),
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

describe("the excess-positional guard", () => {
  /** Register a two-framework tree and return (program, outcomes, calls). */
  function makeTree() {
    const program = makeProgram();
    const { host, calls, outcomes } = makeHost();
    registerGeneratorCommands(
      program,
      [
        { path: ["component"], description: "component generators" },
        {
          path: ["component", "react"],
          generator: makeGenerator("component/react", { positional: true }),
        },
        {
          path: ["component", "svelte"],
          generator: makeGenerator("component/svelte", { positional: true }),
        },
        {
          path: ["dual"],
          generator: makeGenerator("dual", { positional: true }),
        },
        { path: ["dual", "sub"], generator: makeGenerator("dual/sub") },
      ],
      host,
    );
    return { program, outcomes, calls };
  }

  it("emits the designed outcome on a stray operand — exit code 2 as data, action skipped", async () => {
    const { program, outcomes, calls } = makeTree();
    await program.parseAsync(["component", "react", "MyComponent", "Extra"], {
      from: "user",
    });
    expect(outcomes).toEqual([
      {
        kind: "usage-error",
        error: {
          kind: "excess-positional",
          headline: 'unexpected argument "Extra"',
          chain: ["bin", "component", "react"],
        },
        exitCode: 2,
      },
    ]);
    expect(calls).toEqual([]);
  });

  it("suggests the sibling segment when any operand matches one — the chain pre-sliced", async () => {
    const { program, outcomes } = makeTree();
    // `svelte` binds as the positional, `X` overflows — the suggestion still
    // names the sibling the user almost certainly meant.
    await program.parseAsync(["component", "react", "svelte", "X"], {
      from: "user",
    });
    const outcome = outcomes[0] as MountOutcome & { kind: "usage-error" };
    expect(outcome.error).toEqual({
      kind: "excess-positional",
      headline: 'unexpected argument "X"',
      suggestion: "svelte",
      chain: ["bin", "component"],
    });
    expect(renderUsageError(outcome.error)).toBe(
      "error: unexpected argument \"X\"\nDid you mean 'bin component svelte'?",
    );
  });

  it("suggests the child segment on a runnable namespace", async () => {
    const { program, outcomes } = makeTree();
    // `dual` declares one positional; commander routes `dual sub` to the sub
    // command, so reach the excess path with a filled positional + stray `sub`.
    await program.parseAsync(["dual", "value", "sub"], { from: "user" });
    const outcome = outcomes[0] as MountOutcome & { kind: "usage-error" };
    expect(renderUsageError(outcome.error)).toBe(
      "error: unexpected argument \"sub\"\nDid you mean 'bin dual sub'?",
    );
    expect(outcome.exitCode).toBe(2);
  });

  it("a full positional plus flags is not excess", async () => {
    const { program, outcomes, calls } = makeTree();
    await program.parseAsync(
      ["component", "react", "MyComponent", "--no-with-styles"],
      { from: "user" },
    );
    expect(calls).toHaveLength(1);
    expect(outcomes).toEqual([]);
  });
});

describe("the namespace command — shared stray and bare behavior", () => {
  /** Register a three-leaf namespace and return (program, outcomes, calls). */
  function makeNamespaceTree() {
    const program = makeProgram();
    const { host, calls, outcomes } = makeHost();
    registerGeneratorCommands(
      program,
      [
        { path: ["component"], description: "component generators" },
        {
          path: ["component", "react"],
          generator: makeGenerator("component/react", { positional: true }),
        },
        {
          path: ["component", "svelte"],
          generator: makeGenerator("component/svelte", { positional: true }),
        },
        {
          path: ["component", "lit"],
          generator: makeGenerator("component/lit", { positional: true }),
        },
      ],
      host,
    );
    return { program, outcomes, calls };
  }

  it("an unknown segment emits the shared did-you-mean, exit code 2 as data, no dispatch", async () => {
    const { program, outcomes, calls } = makeNamespaceTree();
    await program.parseAsync(["component", "reakt"], { from: "user" });
    expect(outcomes).toEqual([
      {
        kind: "usage-error",
        error: {
          kind: "unknown-segment",
          headline: "unknown command 'reakt'",
          suggestion: "react",
          chain: ["bin", "component"],
        },
        exitCode: 2,
      },
    ]);
    expect(renderUsageError((outcomes[0] as { error: never }).error)).toBe(
      "error: unknown command 'reakt'\nDid you mean 'bin component react'?",
    );
    expect(calls).toEqual([]);
  });

  it("an unmatchable segment gets the suggestion-free outcome", async () => {
    const { program, outcomes } = makeNamespaceTree();
    await program.parseAsync(["component", "vue"], { from: "user" });
    const outcome = outcomes[0] as MountOutcome & { kind: "usage-error" };
    expect(outcome.error).toEqual({
      kind: "unknown-segment",
      headline: "unknown command 'vue'",
      chain: ["bin", "component"],
    });
    expect(outcome.exitCode).toBe(2);
  });

  it("a bare namespace emits its OWN help, exit code 1 as data", async () => {
    const { program, outcomes } = makeNamespaceTree();
    await program.parseAsync(["component"], { from: "user" });
    expect(outcomes).toHaveLength(1);
    const outcome = outcomes[0] as MountOutcome & { kind: "namespace-help" };
    expect(outcome.kind).toBe("namespace-help");
    expect(outcome.help).toContain("Usage: bin component");
    expect(outcome.exitCode).toBe(1);
  });

  it("the bare-namespace help is laid out for the ERROR stream's width, not stdout's", async () => {
    // A 200-column stdout next to an 80-column stderr: the page carried in
    // the outcome must wrap at stderr's width — `helpInformation({ error:
    // true })` — where the bare call would measure stdout's (110-column help
    // into a piped stderr file on a wide terminal, the measured round-8
    // defect). 80, not less: commander skips wrapping when the description
    // column (helpWidth minus the widest term) drops under its
    // minWidthToWrap of 40.
    const program = makeProgram();
    const { host, outcomes } = makeHost();
    const base = makeGenerator("component/react", { positional: true });
    const wide = {
      ...base,
      meta: {
        ...base.meta,
        description:
          "A react component generator whose description is deliberately " +
          "long enough to wrap at eighty columns while fitting two hundred.",
      },
    };
    registerGeneratorCommands(
      program,
      [
        { path: ["component"], description: "component generators" },
        { path: ["component", "react"], generator: wide },
      ],
      host,
    );
    const cmd = program.commands.find(
      (child) => child.name() === "component",
    ) as Command;
    cmd.configureOutput({
      ...cmd.configureOutput(),
      getOutHelpWidth: () => 200,
      getErrHelpWidth: () => 80,
    });
    await program.parseAsync(["component"], { from: "user" });
    const outcome = outcomes[0] as MountOutcome & { kind: "namespace-help" };
    expect(outcome.help).toBe(cmd.helpInformation({ error: true }));
    expect(outcome.help).not.toBe(cmd.helpInformation());
    expect(outcome.exitCode).toBe(1);
  });

  it("a known segment still dispatches to the child, not the namespace action", async () => {
    const { program, outcomes, calls } = makeNamespaceTree();
    await program.parseAsync(["component", "react", "lib/X"], { from: "user" });
    expect(calls).toHaveLength(1);
    expect(outcomes).toEqual([]);
  });
});

describe("emitToProcess — the one process-touching export", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("writes the rendered usage error plus newline on stderr and applies exit code 2", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      emitToProcess({
        kind: "usage-error",
        error: {
          kind: "unknown-segment",
          headline: "unknown command 'reakt'",
          suggestion: "react",
          chain: ["bin", "component"],
        },
        exitCode: 2,
      });
      expect(stderr).toHaveBeenCalledWith(
        "error: unknown command 'reakt'\nDid you mean 'bin component react'?\n",
      );
      expect(process.exitCode).toBe(2);
    } finally {
      stderr.mockRestore();
    }
  });

  it("writes the namespace help verbatim on stderr and applies exit code 1", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      emitToProcess({
        kind: "namespace-help",
        help: "Usage: bin component\n",
        exitCode: 1,
      });
      expect(stderr).toHaveBeenCalledWith("Usage: bin component\n");
      expect(process.exitCode).toBe(1);
    } finally {
      stderr.mockRestore();
    }
  });
});
