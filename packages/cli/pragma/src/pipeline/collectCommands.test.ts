import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaContext } from "../domains/shared/context.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import {
  deriveReservedVerbs,
  isReserved,
  nounVerbFromPath,
  nounVerbFromToolName,
} from "../domains/shared/stories/pack/index.js";
import { allSpecs } from "../mcp/tools/index.js";
import createTestRuntime from "../testing/helpers/createTestRuntime.js";
import collectCommands from "./collectCommands.js";

let runtime: PragmaRuntime;

beforeAll(async () => {
  runtime = await createTestRuntime();
});

afterAll(() => {
  runtime.dispose();
});

function makeCtx(overrides: Partial<PragmaContext> = {}): PragmaContext {
  return {
    ...runtime,
    globalFlags: { llm: false, format: "text" as const, verbose: false },
    ...overrides,
  };
}

describe("collectCommands", () => {
  it("includes block, ontology, and graph command paths", () => {
    const commands = collectCommands(makeCtx());
    const paths = commands.map((command) => command.path.join(" "));

    expect(paths).toContain("block list");
    expect(paths).toContain("block lookup");
    expect(paths).toContain("ontology list");
    expect(paths).toContain("ontology show");
    expect(paths).toContain("graph query");
    expect(paths).toContain("graph inspect");
  });

  // Golden surface: the full built-in command set under default config (no
  // packs), in emission order. The per-(noun, verb) reserved-guard flip must
  // not add, drop, rename, or REORDER a single built-in command — order drives
  // help output and registration — so this list is byte-identical (and
  // order-identical) to the pre-flip surface.
  it("has a stable built-in command surface", () => {
    const paths = collectCommands(makeCtx()).map((command) =>
      command.path.join(" "),
    );

    expect(paths).toEqual([
      "config tier",
      "config channel",
      "config trace",
      "config framework",
      "config show",
      "create component",
      "create package",
      "setup all",
      "setup lsp",
      "setup mcp",
      "setup completions",
      "setup skills",
      "standard list",
      "standard lookup",
      "standard categories",
      "standard sample",
      "modifier list",
      "modifier lookup",
      "modifier sample",
      "tier list",
      "token list",
      "token lookup",
      "tokens add-config",
      "token sample",
      "block list",
      "block lookup",
      "block sample",
      "ontology list",
      "ontology show",
      "graph query",
      "graph inspect",
      "graphql build",
      "graphql check",
      "graphql serve",
      "skill list",
      "skill lookup",
      "doctor",
      "info",
      "upgrade",
      "llm",
      "capabilities",
    ]);
  });
});

// Cross-surface skew invariant (FIX 2 / R4-F1): the CLI and MCP surfaces both
// derive their reserved map through the single shared deriveReservedVerbs, so
// they MUST agree on every leaf read (noun, verb) reservation. If they drifted,
// a pack migrating a `list`/`lookup` verb could be admitted on one surface and
// blocked on the other. Operational nouns legitimately differ (graphql/setup/
// upgrade are CLI-only), so the invariant is scoped to the read verbs that
// packs actually emit.
describe("cross-surface reserved-verb parity", () => {
  const READ_VERBS = ["list", "lookup"] as const;

  it("CLI and MCP reserve the same list/lookup verbs for every leaf read noun", () => {
    const cliPairs = collectCommands(makeCtx()).map((command) =>
      nounVerbFromPath(command.path),
    );
    const mcpPairs = allSpecs.map((spec) => nounVerbFromToolName(spec.name));

    const cliReserved = deriveReservedVerbs(cliPairs);
    const mcpReserved = deriveReservedVerbs(mcpPairs);

    // FIX 1 on the real CLI surface: operational nouns own no list/lookup, so
    // they are reserved wholesale — a pack emitting `list` stays blocked.
    for (const noun of ["config", "graph", "graphql", "setup", "create"]) {
      expect(isReserved(cliReserved, noun, "list")).toBe(true);
    }

    // Leaf read nouns: those that own a `list`/`lookup` verb on either surface.
    const readNouns = new Set(
      [...cliPairs, ...mcpPairs]
        .filter(([, verb]) => verb === "list" || verb === "lookup")
        .map(([noun]) => noun),
    );

    // Sanity: the real leaf-migration targets are present, so this asserts
    // something (a silently empty set would make the test vacuous).
    for (const noun of ["standard", "block", "modifier", "token", "tier"]) {
      expect(readNouns.has(noun)).toBe(true);
    }

    for (const noun of readNouns) {
      for (const verb of READ_VERBS) {
        expect(
          isReserved(cliReserved, noun, verb),
          `CLI/MCP disagree on ${noun} ${verb}`,
        ).toBe(isReserved(mcpReserved, noun, verb));
      }
    }
  });
});
