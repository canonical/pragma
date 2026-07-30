import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    channel: "normal",
    detail: "standard",
  },
}));

/** Anything that would betray THIS distribution leaking through the kernel. */
const THIS_DISTRIBUTION = /pragma|canonical|design[- ]system/i;

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
    // The pack noun leads the page, under the fork's own blurb.
    expect(help).toMatch(/^Explore the recipe graph\n {2}dish\b/m);
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
});
