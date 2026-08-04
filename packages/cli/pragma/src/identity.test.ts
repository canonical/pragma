import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import type { VerbSpec } from "./kernel/spec/types.js";

// A fork's distribution config. Everything the kernel says about itself must
// follow from THIS object — that is the whole claim under test.
vi.mock("../pragma.conf.js", () => ({
  default: {
    name: "recipes",
    help: "Explore the recipe graph",
    // The fork's own story about itself, in the declared shape. It used to be a
    // bare string that nothing read; `collectColophon` reads it now, so the
    // colophon case below can assert this distribution's narrative is gone.
    colophon: {
      markdown:
        "The recipe kitchen is a graph of dishes.\n\n## Why\n\nBecause a menu is a query.",
      summary: "A graph of dishes; a menu is a query.",
    },
    issuesUrl: "https://example.invalid/recipes/issues",
    packs: [],
    // Three, in the order the create surface binds its nouns: that surface now
    // reads its generator PACKAGE NAMES from this declaration (positionally),
    // so a fork's `create` names the fork's packages. `generators: []` used to
    // be enough here; it now fails at the module load of
    // `capabilities/create/constants.ts`, which is the point.
    generators: [
      {
        name: "@kitchen/summon-dish",
        source: "npm:@kitchen/summon-dish@^1.0.0",
      },
      {
        name: "@kitchen/summon-menu",
        source: "npm:@kitchen/summon-menu@^1.0.0",
      },
      {
        name: "@kitchen/summon-service",
        source: "npm:@kitchen/summon-service@^1.0.0",
      },
    ],
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
const originalDataHome = process.env.XDG_DATA_HOME;
afterEach(() => {
  process.env.XDG_CONFIG_HOME = originalConfigHome;
  process.env.XDG_DATA_HOME = originalDataHome;
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

  it("owns its own on-disk skills namespace", async () => {
    // Config, state and cache were namespaced by the bin name; the SKILLS roots
    // were not. Two distributions installed side by side therefore shared one
    // `$XDG_DATA_HOME/pragma/skills` and one `<cwd>/.pragma/skills`, so a fork
    // read the other's skills and could not install its own without collision.
    process.env.XDG_DATA_HOME = join(tmpdir(), "identity-data");
    const { skillRoots, installedSkillsDir } = await import(
      "./capabilities/skill/discover.js"
    );
    expect(installedSkillsDir().endsWith(join("recipes", "skills"))).toBe(true);
    expect(skillRoots("/work")).toEqual([
      join("/work", ".recipes", "skills"),
      installedSkillsDir(),
    ]);
    for (const root of skillRoots("/work")) {
      expect(root).not.toMatch(THIS_DISTRIBUTION);
    }
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

  it("tells the fork's own colophon, in all three formats", async () => {
    // The measurement this closes: on a fork build the colophon carried 4 / 2 /
    // 6 occurrences of THIS distribution's name (plain / llm / json), from a
    // narrative hardcoded under `src/capabilities/colophon/`, the section title,
    // and a JSON-visible `kind` discriminant. All three are content or
    // projection now.
    //
    // EVERY format explicitly, never the auto-selected one: `--format` picks
    // `llm` off a TTY, which is exactly how an earlier probe on this programme
    // reported 3 leaks where the truth was 7 across 5 surfaces. The plain
    // formatter is the one that had never been exercised.
    process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), "identity-col-"));
    const { collectColophon } = await import(
      "./capabilities/colophon/collectColophon.js"
    );
    const { colophonFormatters } = await import(
      "./capabilities/colophon/colophon.render.js"
    );
    const { bootRuntime } = await import("./kernel/runtime/boot.js");

    const data = await collectColophon(
      bootRuntime(
        { llm: false, autoLlm: false, format: "plain", verbose: false },
        mkdtempSync(join(tmpdir(), "identity-cwd-")),
      ),
    );
    expect(data.sections[0]?.kind).toBe("distribution");
    expect(data.sections[0]?.title).toBe("recipes");

    for (const format of ["plain", "llm", "json"] as const) {
      const rendered = colophonFormatters[format](data);
      expect(rendered, format).not.toMatch(THIS_DISTRIBUTION);
      expect(rendered, format).toContain("recipes");
    }
    // Non-vacuity for the `llm` arm specifically: it renders `summary ??
    // markdown`, so the fork's CONDENSED words have to be the ones that reach an
    // agent — not its full body, and not ours.
    expect(colophonFormatters.llm(data)).toContain("a menu is a query");
  });

  it("generates a reference that never names this distribution", async () => {
    // `docs/reference/` is the surface this package PUBLISHES as machine-derived
    // truth, so it is the surface a fork's rename must reach in full. Every
    // command a page quotes, every page title and every prose mention is
    // composed from `BIN_NAME`. The failure names `page: line`, so it is a
    // worklist and not just a count.
    //
    // ONE exemption, the same one the MCP orientation case above makes and for
    // the same reason: the `pragma:` resource scheme is covenant-frozen PROTOCOL
    // identity (`surface.v2.json`), inherited by a fork along with the
    // `pragma/box` and `pragma/instanceCount` `_meta` keys it travels with, and
    // `tools.md` reports it truthfully. Masked from the emitted surface, not by
    // a literal, so a leak the kernel authored itself still fails here.
    const { emitReference } = await import("./kernel/spec/emitReference.js");
    const { emitSurface } = await import("./kernel/spec/emitSurface.js");
    const { capabilities } = await import("./capabilities/index.js");

    const { resources } = emitSurface(capabilities).mcpSurface;
    expect(resources.length).toBeGreaterThan(0);
    const unmask = (line: string): string =>
      resources.reduce((text, template) => text.replace(template, ""), line);

    const offenders: string[] = [];
    for (const [page, content] of emitReference(capabilities)) {
      for (const line of content.split("\n")) {
        if (THIS_NAME.test(unmask(line))) offenders.push(`${page}: ${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("inherits the frozen MCP wire identity unchanged under its own name (PROTECTED)", async () => {
    // The other half of the freeze, and the half that can only be pinned FROM A
    // FORK. `resources.test.ts` compares the covenant entry, the declared
    // template, every minted URI and both `_meta` namespaces to one scheme
    // token — but it runs under THIS distribution's identity, where all four
    // writings are the string `pragma…` whether they are literals or derived
    // from `BIN_NAME`. So it fails on the mutation PR7 actually made (one
    // literal changed) and passes on the mutation the freeze exists to prevent:
    // replacing `URI_TEMPLATE` with `` `${BIN_NAME}:{+uri}` `` is byte-identical
    // there. The reference and orientation cases above cannot see it either —
    // both MASK the emitted template by VALUE, so a derived `recipes:{+uri}` is
    // masked away and nothing asserts the scheme survived the rename.
    //
    // Under this mock the two diverge: a derivation emits `recipes:{+uri}` and
    // the covenant still says `pragma:{+uri}`. Read from `surface.v2.json`, so
    // it is the published contract that decides and not a second literal here.
    const covenant = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../surface/surface.v2.json", import.meta.url)),
        "utf-8",
      ),
    ) as { mcpSurface: { resources: string[] } };
    const frozen = covenant.mcpSurface.resources[0];
    expect(frozen).toBeTruthy();
    const scheme = String(frozen).split(":")[0];

    const { emitSurface } = await import("./kernel/spec/emitSurface.js");
    const { capabilities } = await import("./capabilities/index.js");
    const { buildResourceList, resourceProvider } = await import(
      "./capabilities/resources/provider.js"
    );
    const { readPackIndex } = await import(
      "./kernel/completion/entitySource.js"
    );

    // 1. what the live grammar publishes as the surface, and 2. what `register`
    // installs — both still the covenant's token, under a distribution called
    // something else.
    expect(emitSurface(capabilities).mcpSurface.resources).toEqual([frozen]);
    expect(resourceProvider.surface?.templates).toEqual([frozen]);

    // 3. every URI the listing mints, and 4. both `_meta` key namespaces. These
    // are the sites PR7 left literal while deriving the template; asserting
    // them here is what keeps the pair moving together in EITHER direction.
    const listed = [
      ...buildResourceList(readPackIndex({ kind: "embedded" })),
      ...buildResourceList(undefined),
    ];
    expect(listed.length).toBeGreaterThan(1);
    expect(listed.filter((r) => !r.uri.startsWith(`${scheme}:`))).toEqual([]);
    const metaKeys = new Set(listed.flatMap((r) => Object.keys(r._meta ?? {})));
    expect(metaKeys.has(`${scheme}/box`)).toBe(true);
    expect([...metaKeys].filter((k) => !k.startsWith(`${scheme}/`))).toEqual(
      [],
    );
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
