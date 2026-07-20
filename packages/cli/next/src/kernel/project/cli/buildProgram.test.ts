import chalk from "chalk";
import { afterAll, describe, expect, it, vi } from "vitest";
import { VERSION } from "../../../constants.js";
import { fixtureModule } from "../../../testing/fixtures/fixtureCapability.js";
import { projectCli } from "../../../testing/helpers/projectCli.js";
import type { CapabilityModule, VerbSpec } from "../../spec/types.js";
import { formatRootHelp } from "./rootHelp.js";

// Root/noun/verb help styling (helpFormat.ts) routes through chalk, whose
// `supports-color` enables color when GITHUB_ACTIONS is set — even off a TTY —
// so CI would paint ANSI into these plain goldens and the bare-noun `--help`
// comparison. Pin the level to 0 for deterministic, color-free renders (the same
// guard colophon.render.test.ts / verbHelp.test.ts use). Module scope so the
// collection-time formatRootHelp() call below renders plain too.
const prevChalkLevel = chalk.level;
chalk.level = 0;
afterAll(() => {
  chalk.level = prevChalkLevel;
});

/** A minimal verb under an arbitrary path, for help-grouping tests. */
function makeVerb(path: [string, string?]): VerbSpec {
  return {
    path,
    summary: `${path.filter(Boolean).join(" ")} summary`,
    params: [],
    output: {
      formatters: {
        plain: (d) => String(d),
        llm: (d) => String(d),
        json: (d) => JSON.stringify(d),
      },
    },
    capability: { needsStore: false, mutates: false, mcp: { expose: true } },
    run: async () => null,
  };
}

describe("buildProgram — flags", () => {
  const program = projectCli([fixtureModule]);
  const widget = program.commands.find((c) => c.name() === "widget");
  const make = widget?.commands.find((c) => c.name() === "make");
  const list = widget?.commands.find((c) => c.name() === "list");

  it("registers a camelCase flag in kebab form", () => {
    expect(make?.options.map((o) => o.long)).toContain("--with-history");
  });

  it("auto-injects --dry-run/--undo/--yes onto a mutating verb", () => {
    expect(make?.options.map((o) => o.long)).toEqual(
      expect.arrayContaining(["--dry-run", "--undo", "--yes"]),
    );
  });

  it("does not inject mutation flags onto a read verb", () => {
    expect(list?.options.map((o) => o.long)).not.toContain("--dry-run");
  });

  it("carries the positional into the command usage", () => {
    expect(make?.usage()).toContain("<name>");
  });
});

describe("buildProgram — early exits", () => {
  it("throws commander.version for --version, writing the version", async () => {
    const program = projectCli([fixtureModule]);
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk));
        return true;
      });
    await expect(
      program.parseAsync(["--version"], { from: "user" }),
    ).rejects.toMatchObject({ code: "commander.version" });
    spy.mockRestore();
    expect(writes.join("")).toContain(VERSION);
  });

  it("throws commander.helpDisplayed for --help", async () => {
    const program = projectCli([fixtureModule]);
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await expect(
      program.parseAsync(["--help"], { from: "user" }),
    ).rejects.toMatchObject({ code: "commander.helpDisplayed" });
    spy.mockRestore();
  });

  it("throws commander.unknownCommand for an unknown noun", async () => {
    const program = projectCli([fixtureModule]);
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await expect(
      program.parseAsync(["widgt"], { from: "user" }),
    ).rejects.toMatchObject({ code: "commander.unknownCommand" });
    spy.mockRestore();
  });
});

describe("buildProgram — lazy dispatch", () => {
  it("does not evaluate a verb's run body while building the tree", () => {
    const boom: CapabilityModule = {
      name: "boom",
      verbs: [
        {
          path: ["boom", "go"],
          summary: "Explodes if its run body is invoked at build time.",
          params: [],
          output: {
            formatters: {
              plain: (d) => String(d),
              llm: (d) => String(d),
              json: (d) => JSON.stringify(d),
            },
          },
          capability: {
            needsStore: false,
            mutates: false,
            mcp: { expose: false, reason: "test" },
          },
          run: () => {
            throw new Error("run body evaluated during build");
          },
        },
      ],
    };
    expect(() => projectCli([boom])).not.toThrow();
  });
});

/** A read verb whose run body renders a distinguishable marker, for routing. */
function recordingVerb(path: [string, string?], marker: string): VerbSpec {
  return {
    path,
    summary: `${path.filter(Boolean).join(" ")} summary`,
    params: [],
    output: {
      formatters: {
        plain: () => marker,
        llm: () => marker,
        json: () => JSON.stringify({ marker }),
      },
    },
    capability: { needsStore: false, mutates: false, mcp: { expose: true } },
    run: async () => marker,
  };
}

/** A mutating self-verb, to prove mutation flags land on the noun parent. */
function mutatingSelfVerb(noun: string): VerbSpec {
  return {
    path: [noun],
    summary: `${noun} summary`,
    params: [],
    output: {
      formatters: {
        plain: () => noun,
        llm: () => noun,
        json: () => JSON.stringify({ noun }),
      },
    },
    capability: { needsStore: false, mutates: true, mcp: { expose: true } },
    // A mutation returns a Task; a bare no-op is enough for structural checks.
    run: () => ({ _tag: "Pure", value: noun }) as never,
  };
}

describe("buildProgram — mixed self+sub-verb noun (setup shape)", () => {
  /** A noun that is BOTH directly runnable and has sub-verbs — setup's shape. */
  const mixed: CapabilityModule = {
    name: "kitish",
    verbs: [
      recordingVerb(["kit"], "SELF"),
      recordingVerb(["kit", "mcp"], "SUB_MCP"),
      recordingVerb(["kit", "skills"], "SUB_SKILLS"),
    ],
  };

  it("registers the noun parent exactly once", () => {
    const program = projectCli([mixed]);
    const kits = program.commands.filter((c) => c.name() === "kit");
    expect(kits).toHaveLength(1);
    const kit = kits[0];
    expect(kit?.commands.map((c) => c.name()).sort()).toEqual([
      "mcp",
      "skills",
    ]);
  });

  it("`kit` (bare) dispatches the self-verb", async () => {
    const program = projectCli([mixed]);
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk));
        return true;
      });
    await program.parseAsync(["kit"], { from: "user" });
    spy.mockRestore();
    expect(writes.join("")).toContain("SELF");
    expect(writes.join("")).not.toContain("SUB_");
  });

  it("`kit mcp` dispatches the sub-verb, not the self-verb", async () => {
    const program = projectCli([mixed]);
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk));
        return true;
      });
    await program.parseAsync(["kit", "mcp"], { from: "user" });
    spy.mockRestore();
    expect(writes.join("")).toContain("SUB_MCP");
    expect(writes.join("")).not.toContain("SELF");
  });

  it("carries a mutating self-verb's mutation flags onto the noun parent", () => {
    const module: CapabilityModule = {
      name: "kit2ish",
      verbs: [mutatingSelfVerb("kit2"), recordingVerb(["kit2", "one"], "ONE")],
    };
    const program = projectCli([module]);
    const kit2 = program.commands.find((c) => c.name() === "kit2");
    expect(kit2?.options.map((o) => o.long)).toEqual(
      expect.arrayContaining(["--dry-run", "--undo", "--yes"]),
    );
    // The sub-verb is still reachable under the same parent.
    expect(kit2?.commands.map((c) => c.name())).toContain("one");
  });

  it("throws at build time when a mixed-noun self-verb declares a positional", () => {
    // The documented invariant, now enforced: a self-verb sharing a noun with
    // sub-verbs must have NO positional (else `<noun> <sub>` would shadow the
    // positional value and Commander would silently drop it from the model).
    const selfWithPositional: VerbSpec = {
      path: ["kit3"],
      summary: "kit3 summary",
      params: [
        {
          kind: "string",
          name: "target",
          doc: "a positional",
          positional: true,
        },
      ],
      output: {
        formatters: { plain: () => "", llm: () => "", json: () => "{}" },
      },
      capability: { needsStore: false, mutates: false, mcp: { expose: true } },
      run: async () => null,
    };
    const module: CapabilityModule = {
      name: "kit3ish",
      verbs: [selfWithPositional, recordingVerb(["kit3", "one"], "ONE")],
    };
    expect(() => projectCli([module])).toThrow(/must have no positional/);
  });
});

describe("buildProgram — sub-verb-only noun invoked bare (U2)", () => {
  /** A noun with ONLY sub-verbs and no self-verb — block/config/… shape. */
  const subOnly: CapabilityModule = {
    name: "gadgetish",
    verbs: [
      recordingVerb(["gadget", "list"], "GADGET_LIST"),
      recordingVerb(["gadget", "show"], "GADGET_SHOW"),
    ],
  };

  /** Parse `argv`, capturing everything written to stdout and any thrown exit. */
  async function run(argv: string[]): Promise<{ out: string; threw: unknown }> {
    const program = projectCli([subOnly]);
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk));
        return true;
      });
    let threw: unknown;
    try {
      await program.parseAsync(argv, { from: "user" });
    } catch (error) {
      threw = error;
    } finally {
      spy.mockRestore();
    }
    return { out: writes.join(""), threw };
  }

  it("`gadget` (bare) prints the SAME page as `gadget --help`, exit 0", async () => {
    const bare = await run(["gadget"]);
    const help = await run(["gadget", "--help"]);

    // The bare action returns normally (exit 0) — it never throws the way
    // `--help` does (commander.helpDisplayed).
    expect(bare.threw).toBeUndefined();
    expect(bare.out).toContain("Usage: pragma gadget <verb> [flags]");
    expect(bare.out).toContain("list");
    expect(bare.out).toContain("show");
    // Byte-for-byte identical to the designed `--help` page.
    expect(bare.out).toBe(help.out);
  });

  it("`gadget list` still routes to the sub-verb, not the bare-help action", async () => {
    const routed = await run(["gadget", "list"]);
    expect(routed.out).toContain("GADGET_LIST");
    expect(routed.out).not.toContain("Usage: pragma gadget <verb>");
  });

  it("`gadget bogus` re-raises unknownCommand so the bin can suggest a verb", async () => {
    // The regression guard: the bare-help action must NOT swallow an
    // unrecognized sub-verb into a generic "too many arguments" — it re-raises
    // the same commander.unknownCommand the suggester routes on.
    const bogus = await run(["gadget", "bogus"]);
    expect(bogus.out).not.toContain("Usage: pragma gadget <verb>");
    expect((bogus.threw as { code?: string })?.code).toBe(
      "commander.unknownCommand",
    );
  });
});

describe("formatRootHelp — grouping", () => {
  const help = formatRootHelp("pragma", "pragma test", [
    makeVerb(["info"]),
    makeVerb(["config", "show"]),
    makeVerb(["block", "list"]),
  ]);

  it("shows the task-oriented section titles for live nouns", () => {
    expect(help).toContain("Explore the design system");
    expect(help).toContain("Set up & maintain");
  });

  it("lists the live nouns and always-available mcp", () => {
    expect(help).toContain("block");
    expect(help).toContain("config");
    expect(help).toContain("info");
    expect(help).toContain("mcp");
  });

  it("drops nouns that are not present", () => {
    expect(help).not.toContain("token");
    expect(help).not.toContain("graphql");
  });

  it("shows the global flags block", () => {
    expect(help).toContain("Global flags");
    expect(help).not.toContain("--llm");
    expect(help).toContain("--format <plain|llm|json>");
    expect(help).toContain("--detail <level>");
  });

  it("renders the unified root page (restyle golden)", () => {
    expect(help).toMatchInlineSnapshot(`
      "pragma — pragma test

      Usage: pragma <command> [subcommand] [flags]

      Explore the design system
        block   Inspect components & patterns and their anatomy

      Set up & maintain
        config  Read and write pragma configuration
        info    Show version, config, and update status

      For AI agents
        mcp     Start the MCP server over stdio

      Global flags
        --format <plain|llm|json>  Select output format (llm = condensed Markdown for agents)
        --detail <level>           Progressive-disclosure level (summary, standard, detailed)
        --verbose                  Diagnostic output on stderr
        --help                     Show help (works on any command)
        --version                  Show the CLI version

      Run \`pragma <command> --help\` for details, or \`pragma capabilities\` to get oriented."
    `);
  });
});
