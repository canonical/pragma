import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import chalk from "chalk";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import type { VerbSpec } from "./kernel/spec/types.js";

// A fork's distribution config. Everything the kernel says about itself must
// follow from THIS object — that is the whole claim under test.
vi.mock("../pragma.conf.js", () => ({
  default: {
    name: "recipes",
    help: "Explore the recipe graph",
    colophon: "Made by the kitchen.",
    issuesUrl: "https://example.invalid/recipes/issues",
    packs: [],
    generators: [],
    prefixes: { rcp: "https://example.invalid/recipes/" },
    channel: "normal",
    detail: "standard",
  },
  // The fork's domain vocabulary, declared beside its identity. Every read of
  // a domain term must follow from THIS object, which the last case below
  // asserts by capturing the SPARQL the readers actually emit.
  vocabulary: {
    altName: "rcp:name",
    prompt: {
      type: "rcp:Prompt",
      body: "rcp:promptBody",
      argument: "rcp:promptArgument",
      argName: "rcp:argName",
      argRequired: "rcp:argRequired",
    },
  },
}));

/** Anything that would betray THIS distribution leaking through the kernel. */
const THIS_DISTRIBUTION = /pragma|canonical|design[- ]system/i;

/**
 * THIS distribution's name alone. The generated reference legitimately carries
 * bundled-pack CONTENT a fork owns and edits — `@canonical/…` package names in
 * `create` examples, `ds:`/`cs:` entity values — so the reference probe below
 * is scoped to the one token that must never survive a rename.
 */
const THIS_NAME = /\bpragma\b/i;

// chalk paints ANSI when GITHUB_ACTIONS is set even off a TTY, which would
// break the plain-text structure assertions below.
const prevChalkLevel = chalk.level;
chalk.level = 0;
afterAll(() => {
  chalk.level = prevChalkLevel;
});

const originalConfigHome = process.env.XDG_CONFIG_HOME;
afterEach(() => {
  process.env.XDG_CONFIG_HOME = originalConfigHome;
});

/** A pack-contributed noun the kernel has never heard of. */
const dishList: VerbSpec = {
  path: ["dish", "list"],
  summary: "List every dish in the graph.",
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

describe("identity projection — a fork changes values, not code (PROTECTED)", () => {
  it("names the bin, the MCP server, and the recovery prefix from the distribution", async () => {
    const c = await import("./constants.js");
    expect(c.BIN_NAME).toBe("recipes");
    expect(c.MCP_SERVER_NAME).toBe("recipes");
    expect(c.RECOVERY_CLI_PREFIX).toBe("recipes ");
    expect(c.PROGRAM_DESCRIPTION).toBe("Explore the recipe graph");
    expect(c.ISSUES_URL).toBe("https://example.invalid/recipes/issues");
  });

  it("installs its completion script under the fork's name, in all three shells", async () => {
    // The basename is load-bearing, not cosmetic — `shell.ts` records what each
    // shell measurably does with it (fish and bash-completion autoload BY the
    // command's name; zsh binds by the `#compdef` tag but autoloads a function
    // named after the file). A mismatch installs a file the shell never loads
    // while `setup completions` prints success, `doctor` passes, and TAB does
    // nothing. It can only be pinned from a fork: with the distribution named
    // `pragma` a hardcoded literal and `BIN_NAME` agree by construction, so a
    // test in `setup.test.ts` cannot fail. Here they cannot agree by accident.
    const { completionScriptPath } = await import(
      "./capabilities/setup/shell.js"
    );
    expect(basename(completionScriptPath("zsh"))).toBe("_recipes");
    expect(basename(completionScriptPath("bash"))).toBe("recipes");
    expect(basename(completionScriptPath("fish"))).toBe("recipes.fish");
  });

  it("renders a front door that names only the fork", async () => {
    const { BIN_NAME, PROGRAM_DESCRIPTION } = await import("./constants.js");
    const { formatRootHelp } = await import("./kernel/project/cli/rootHelp.js");
    const { configModule } = await import("./capabilities/config/index.js");
    const { upgradeModule } = await import("./capabilities/upgrade/index.js");
    const { colophonModule } = await import("./capabilities/colophon/index.js");

    const help = formatRootHelp(BIN_NAME, PROGRAM_DESCRIPTION, [
      dishList,
      ...configModule.verbs,
      ...upgradeModule.verbs,
      ...colophonModule.verbs,
    ]);

    expect(help).not.toMatch(THIS_DISTRIBUTION);
    expect(help).toMatch(/^recipes — Explore the recipe graph$/m);
    // The pack noun leads the page untitled, and the blurb is not repeated as
    // a heading three lines under the header that already carries it.
    expect(help).toMatch(/^Usage: recipes .*\n\n {2}dish\b/m);
    expect(help.match(/Explore the recipe graph/g)).toHaveLength(1);
    expect(help).toContain("Read and write recipes configuration");
  });

  it("orients an MCP agent with the fork's identity", async () => {
    const { buildInstructions } = await import(
      "./kernel/project/mcp/instructions.js"
    );
    const { emitSurface } = await import("./kernel/spec/emitSurface.js");
    const { capabilities } = await import("./capabilities/index.js");

    // The `pragma:` resource scheme is covenant-frozen PROTOCOL identity
    // (surface.v2.json), not copy. The orientation DERIVES it from the emitted
    // surface, so mask exactly what the surface declares — a leak the kernel
    // authored itself would survive this substitution and fail below.
    const { resources } = emitSurface(capabilities).mcpSurface;
    expect(resources.length).toBeGreaterThan(0);
    const text = resources.reduce(
      (orientation, template) => orientation.replace(template, "<resource>"),
      buildInstructions(capabilities),
    );

    expect(text).not.toMatch(THIS_DISTRIBUTION);
    // No punctuation is appended to the fork's `help` phrase.
    expect(text.startsWith("recipes — Explore the recipe graph (")).toBe(true);
  });

  it("greets a first-time user with the fork's issues URL and config file", async () => {
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "identity-"));
    const { ensureFirstRun } = await import("./kernel/config/firstRun.js");
    const { globalConfigPath } = await import("./kernel/config/paths.js");

    const lines: string[] = [];
    await ensureFirstRun((line) => lines.push(line));
    const greeting = lines.join("\n");

    // Nothing is masked: the resolved config path is IN the greeting, so the
    // XDG namespace has to follow the fork's name too or this assertion fails.
    expect(greeting).not.toMatch(THIS_DISTRIBUTION);
    expect(greeting).toContain(globalConfigPath());
    expect(globalConfigPath()).toContain("/recipes/");
    expect(greeting).toContain("https://example.invalid/recipes/issues");
    expect(greeting).toContain("`recipes.config.ts`");
  });

  it("registers an MCP server entry the fork's own binary answers to", async () => {
    // The entry `setup mcp` writes is what a harness later EXECUTES. It was
    // hardcoded while the key it is stored under derived from the same
    // identity, so a fork registered a `recipes` server that ran `pragma` —
    // and `doctor`'s `MCP configured` check, which re-derived the key by hand,
    // could never see its own registration.
    const { pragmaMcpEntry } = await import(
      "./capabilities/setup/operations/setupMcp.js"
    );
    expect(pragmaMcpEntry("/work")).toEqual({
      command: "recipes",
      args: ["mcp"],
      cwd: "/work",
    });
  });

  it("generates a reference that never names this distribution", async () => {
    // `docs/reference/` is the surface this package PUBLISHES as machine-derived
    // truth, so it is the surface a fork's rename must reach in full. Every
    // command a page quotes, every page title and every prose mention is
    // composed from `BIN_NAME`; nothing here is exempt. The failure names
    // `page: line`, so it is a worklist and not just a count.
    const { emitReference } = await import("./kernel/spec/emitReference.js");
    const { capabilities } = await import("./capabilities/index.js");

    const offenders: string[] = [];
    for (const [page, content] of emitReference(capabilities)) {
      for (const line of content.split("\n")) {
        if (THIS_NAME.test(line)) offenders.push(`${page}: ${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("reads the graph with the fork's declared terms, not this distribution's", async () => {
    // The couplings this tranche removed were all hardcoded terms, and a
    // hardcoded term still passes every other test in this suite: the fixtures
    // on both sides would simply agree. So capture what the readers EMIT.
    const { DEFAULT_PREFIX_MAP } = await import("./kernel/render/prefixes.js");
    const { runTierLookup } = await import("./capabilities/tier/runLookup.js");
    const { readPrompts } = await import(
      "./kernel/project/mcp/prompts/source.js"
    );

    // The display/expansion map: the fork's namespaces, none of ours, and the
    // W3C half the kernel owns unchanged.
    expect(DEFAULT_PREFIX_MAP.rcp).toBe("https://example.invalid/recipes/");
    expect(DEFAULT_PREFIX_MAP.ds).toBeUndefined();
    expect(DEFAULT_PREFIX_MAP.rdfs).toBe(
      "http://www.w3.org/2000/01/rdf-schema#",
    );

    // The tier noun's LIST query is no longer code: it is a story the
    // distribution declares, so a fork writes its own terms into it directly
    // and there is nothing here for a hardcoded term to hide in.
    // `distribution.test.ts` holds this distribution's declaration to the same
    // class and property the tier code below reads.
    //
    // The two generated reads, captured off a stub facade.
    const queries: string[] = [];
    const recorder = {
      query: {
        sparql: (query: string) => {
          queries.push(query);
          return Promise.resolve({ type: "select", bindings: [] });
        },
      },
    } as never;

    await expect(runTierLookup(recorder, "Starters")).rejects.toMatchObject({
      code: "ENTITY_NOT_FOUND",
    });
    await expect(readPrompts(recorder)).resolves.toEqual([]);

    const emitted = queries.join("\n");
    expect(emitted).toContain("rcp:name");
    expect(emitted).toContain("rcp:Prompt");
    expect(emitted).toContain("rcp:promptBody");
    expect(emitted).not.toMatch(THIS_DISTRIBUTION);
  });
});
