import { describe, expect, it, vi } from "vitest";
import { VERSION } from "../../../constants.js";
import { fixtureModule } from "../../../testing/fixtures/fixtureCapability.js";
import { projectCli } from "../../../testing/helpers/projectCli.js";
import type { CapabilityModule, VerbSpec } from "../../spec/types.js";
import { formatRootHelp } from "./rootHelp.js";

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

describe("formatRootHelp — grouping", () => {
  const help = formatRootHelp("pragma2", "pragma test", [
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
    expect(help).toContain("--llm");
    expect(help).toContain("--detail <level>");
  });
});
