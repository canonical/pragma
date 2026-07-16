import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaContext } from "../domains/shared/context.js";
import type { PragmaRuntime } from "../domains/shared/runtime.js";
import {
  deriveReservedVerbs,
  isReserved,
  nounVerbFromPath,
  nounVerbFromToolName,
} from "../domains/shared/stories/pack/index.js";
import { allSpecs, MCP_EXTRA_RESERVED } from "../mcp/tools/index.js";
import createTestRuntime from "../testing/helpers/createTestRuntime.js";
import collectCommands, { builtInCommands } from "./collectCommands.js";

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

  // Golden surface: the full built-in command set, in emission order. The
  // per-(noun, verb) reserved-guard flip must not add, drop, rename, or REORDER
  // a single built-in command — order drives help output and registration.
  // `tier list` and the whole `standard` noun are no longer here: the
  // hand-written domains were deleted and are served by bundled story packs
  // (asserted below).
  it("has a stable built-in command surface", () => {
    const paths = builtInCommands(makeCtx()).map((command) =>
      command.path.join(" "),
    );

    expect(paths).toEqual([
      "config tier",
      "config channel",
      "config detail",
      "config trace",
      "config framework",
      "config show",
      "create component",
      "create package",
      "create application",
      "create domain",
      "create route",
      "create wrapper",
      "setup",
      "setup lsp",
      "setup mcp",
      "setup completions",
      "setup skills",
      "modifier sample",
      "tokens add-config",
      "token sample",
      "block list",
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
      "prompt list",
      "prompt lookup",
      "doctor",
      "info",
      "upgrade",
      "capabilities",
    ]);
  });

  it("serves `tier list` and the modifier read verbs from bundled packs, not built-ins", () => {
    const builtInPaths = builtInCommands(makeCtx()).map((c) =>
      c.path.join(" "),
    );
    const allPaths = collectCommands(makeCtx()).map((c) => c.path.join(" "));

    for (const path of [
      "tier list",
      "modifier list",
      "modifier lookup",
      "token list",
      "token lookup",
      // block is a PARTIAL migration: only the lookup verb is pack-served,
      // while the config-filtered `block list` stays built-in.
      "block lookup",
    ]) {
      expect(builtInPaths).not.toContain(path);
      expect(allPaths).toContain(path);
    }
  });

  it("serves the whole `standard` noun from the bundled pack", () => {
    const builtInPaths = builtInCommands(makeCtx()).map((c) =>
      c.path.join(" "),
    );
    const allPaths = collectCommands(makeCtx()).map((c) => c.path.join(" "));

    const standardVerbs = [
      "standard list",
      "standard lookup",
      "standard categories",
      "standard sample",
    ];
    for (const path of standardVerbs) {
      expect(builtInPaths).not.toContain(path);
      expect(allPaths).toContain(path);
    }
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
    // Both surfaces derive reservations from BUILT-INS only (production reserves
    // from built-ins, before appending packs), so a bundled/config/package pack
    // never inflates the reserved map. Using collectCommands here would fold the
    // bundled tier pack into the CLI side and break the symmetry.
    const cliPairs = builtInCommands(makeCtx()).map((command) =>
      nounVerbFromPath(command.path),
    );
    // The MCP surface folds in its explicit no-spec reservations (the
    // `prompt` noun — its MCP projection is prompts/list, not a tool).
    const mcpPairs = [
      ...allSpecs.map((spec) => nounVerbFromToolName(spec.name)),
      ...MCP_EXTRA_RESERVED,
    ];

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
    // something (a silently empty set would make the test vacuous). `tier`,
    // `standard`, `modifier`, and `token` read verbs are no longer here — all
    // were cut over to bundled packs (only the `modifier sample`/`token sample`/
    // `tokens add-config` built-in remnants remain), so they are correctly
    // absent from the built-in reserved surface on both sides. `block` is the
    // last hand-written read domain.
    for (const noun of ["block"]) {
      expect(readNouns.has(noun)).toBe(true);
    }
    expect(readNouns.has("standard")).toBe(false);
    expect(readNouns.has("modifier")).toBe(false);
    expect(readNouns.has("token")).toBe(false);

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
