/**
 * Harness-foundation smoke tests (commit 1).
 *
 * Validates the framework pieces PR4 adds — NOT per-noun behavior (that's
 * commits 2/4's job). Proves: (1) `bootFixtureRuntime` boots a real,
 * lock-backed store that BOTH the CLI and MCP surfaces resolve identically
 * (via the shared canonical graph, one real lookup); (2) the compiler/runtime
 * is ontology-agnostic — a pack over the foreign `ex:` recipe namespace
 * registers its 2 tools and resolves on both surfaces; (3) `runCli` can spawn
 * and capture the real bin; (4) the golden `plain()` normalizer does its job.
 */

import { homedir, tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { blockModule } from "../../capabilities/block/index.js";
import { VERSION } from "../../constants.js";
import { compilePack } from "../../kernel/packs/compile.js";
import { verbKey } from "../../kernel/packs/uniqueness.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import {
  CANONICAL_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  RECIPE_PREFIXES,
  RECIPE_TTL,
  recipePack,
} from "../fixtures/packs/recipe.js";
import { bootFixtureRuntime } from "../helpers/fixtureGraph.js";
import { plain } from "../helpers/golden.js";
import { assertCliMcpParity } from "../helpers/parity.js";
import { runCli } from "../helpers/runCli.js";

describe("bootFixtureRuntime — the shared canonical graph (commit-1 smoke)", () => {
  it("boots a lock-backed store both CLI and MCP resolve identically", async () => {
    const fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: CANONICAL_CONFIG,
    });
    try {
      const lookupVerb = blockModule.verbs.find(
        (v) => verbKey(v.path) === "block lookup",
      );
      expect(lookupVerb).toBeDefined();
      if (!lookupVerb) return;

      const envelope = await assertCliMcpParity({
        modules: [blockModule],
        verb: lookupVerb,
        tool: "block_lookup",
        cwd: fixture.cwd,
        params: { name: ["Button"] },
      });
      const data = envelope.data as {
        results: { name: string; uri: string }[];
      };
      expect(data.results[0]?.name).toBe("Button");
      expect(data.results[0]?.uri).toBe("https://ds.canonical.com/button");
    } finally {
      await fixture.dispose();
    }
  });
});

describe("foreign-namespace generic-pack proof (compiler is DS-agnostic)", () => {
  it("a pack over `ex:` recipes registers 2 tools and resolves on both surfaces", async () => {
    const fixture = await bootFixtureRuntime({ ttl: RECIPE_TTL });
    try {
      const recipeModule: CapabilityModule = {
        name: "recipe",
        verbs: compilePack(recipePack, "test:recipe", RECIPE_PREFIXES),
      };
      expect(recipeModule.verbs.map((v) => verbKey(v.path)).sort()).toEqual([
        "recipe list",
        "recipe lookup",
      ]);

      const listVerb = recipeModule.verbs.find(
        (v) => verbKey(v.path) === "recipe list",
      );
      expect(listVerb).toBeDefined();
      if (!listVerb) return;

      const listEnvelope = await assertCliMcpParity({
        modules: [recipeModule],
        verb: listVerb,
        tool: "recipe_list",
        cwd: fixture.cwd,
      });
      const rows = listEnvelope.data as { name: string; cuisine: string }[];
      expect(rows.map((r) => r.name).sort()).toEqual(["Gazpacho", "Pancakes"]);

      const lookupVerb = recipeModule.verbs.find(
        (v) => verbKey(v.path) === "recipe lookup",
      );
      expect(lookupVerb).toBeDefined();
      if (!lookupVerb) return;

      const lookupEnvelope = await assertCliMcpParity({
        modules: [recipeModule],
        verb: lookupVerb,
        tool: "recipe_lookup",
        cwd: fixture.cwd,
        params: { name: ["Pancakes"] },
      });
      const data = lookupEnvelope.data as {
        results: { instructions: string }[];
      };
      expect(data.results[0]?.instructions).toContain("griddle");
    } finally {
      await fixture.dispose();
    }
  });
});

describe("runCli — spawn-capture smoke", () => {
  it("captures --version from the source entry point", () => {
    const result = runCli(["--version"], { mode: "source" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(VERSION);
    expect(result.stderr).toBe("");
  });
});

describe("golden plain() normalizer", () => {
  it("strips ANSI escapes and tokenizes machine-specific paths", () => {
    const colored = "\x1b[1mHello\x1b[0m world";
    expect(plain(colored)).toBe("Hello world");

    const withTmp = `wrote to ${tmpdir()}/foo.json`;
    expect(plain(withTmp)).toBe("wrote to <tmp>/foo.json");

    const withHome = `config at ${homedir()}/.config/pragma`;
    expect(plain(withHome)).toBe("config at <home>/.config/pragma");
  });
});
