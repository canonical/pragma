/**
 * Doc-example tests: every `pragma` command shown in the published README and
 * the getting-started guide must be REAL. Two tiers, both driven off the live
 * grammar (never a hand-copied list):
 *
 * - Tier 1 (grammar) — every extracted command's noun/verb resolves and every
 *   `--flag` is one the verb (or the global/mutation set) declares. Storeless.
 * - Tier 2 (execution) — a curated set of read commands is PARSED through the
 *   real CLI grammar (so the param bag is derived from the documented string,
 *   never hand-supplied) and then booted against the canonical fixture graph
 *   and asserted to exit 0, proving the documented reads run, not just parse.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import {
  executeVerb,
  extractParams,
} from "../../kernel/project/cli/dispatch.js";
import {
  nounVerbMap,
  resolveUnknownCommand,
} from "../../kernel/project/cli/suggest.js";
import { kebabCase } from "../../kernel/spec/emitSurface.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  CANONICAL_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import { extractPragmaCommands } from "../helpers/extractSnippets.js";
import { bootFixtureRuntime } from "../helpers/fixtureGraph.js";
import { projectCli } from "../helpers/projectCli.js";

/** Read a shipped doc exactly as a reader (or lychee) would. */
function readDoc(relPath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relPath, import.meta.url)),
    "utf-8",
  );
}

/** Every hand-written doc whose fenced `pragma` examples must be real grammar. */
const HAND_WRITTEN_DOCS = [
  "../../../README.md",
  "../../../docs/getting-started.md",
  "../../../docs/mcp-integration.md",
  "../../../docs/config-model.md",
  "../../../docs/architecture.md",
  "../../../docs/skills.md",
];

const commands = HAND_WRITTEN_DOCS.flatMap((doc) =>
  extractPragmaCommands(readDoc(doc)),
);

/** Every non-hidden verb, flattened from the live catalog. */
const allVerbs: VerbSpec[] = capabilities
  .flatMap((module) => [...module.verbs])
  .filter((verb) => !verb.hidden);
const nouns = nounVerbMap(allVerbs);

/** `"noun verb"` (or `"noun"` for a self-verb) → the runnable spec. */
const specByKey = new Map<string, VerbSpec>();
for (const verb of allVerbs) {
  const sub = verb.path[1];
  specByKey.set(
    sub === undefined ? verb.path[0] : `${verb.path[0]} ${sub}`,
    verb,
  );
}

/** Flags valid on every command, beyond a verb's own declared flags. */
const AMBIENT_FLAGS = new Set([
  "--llm",
  "--format",
  "--verbose",
  "--detail",
  "--dry-run",
  "--undo",
  "--yes",
  "--help",
  "--version",
]);

/** The positional tokens of a command (drops `pragma` and every `-`-prefixed token). */
function readPositionals(command: string): string[] {
  return command
    .split(/\s+/)
    .slice(1)
    .filter((token) => !token.startsWith("-"));
}

/** Resolve a command's `VerbSpec` from its positionals (verb pair, else self-verb). */
function resolveSpec(positionals: readonly string[]): VerbSpec | undefined {
  const noun = positionals.at(0);
  const verb = positionals.at(1);
  if (noun === undefined) return undefined;
  const paired =
    verb !== undefined ? specByKey.get(`${noun} ${verb}`) : undefined;
  return paired ?? specByKey.get(noun);
}

/** The set of flags a verb accepts: its own declared flags plus the ambient set. */
function collectValidFlags(verb: VerbSpec): Set<string> {
  const flags = new Set(AMBIENT_FLAGS);
  for (const param of verb.params) {
    if (!param.positional) flags.add(`--${kebabCase(param.name)}`);
  }
  return flags;
}

describe("doc examples — Tier 1: every documented command is grammatical", () => {
  it("extracts commands from the docs", () => {
    // A guard against a broken extractor silently passing everything else.
    expect(commands.length).toBeGreaterThan(0);
  });

  it("resolves every command's noun and verb", () => {
    for (const command of commands) {
      const unknown = resolveUnknownCommand(readPositionals(command), nouns);
      expect(unknown, `unresolved command: ${command}`).toBeUndefined();
    }
  });

  it("uses only flags the verb or the ambient set declares", () => {
    for (const command of commands) {
      const spec = resolveSpec(readPositionals(command));
      expect(spec, `no spec for: ${command}`).toBeDefined();
      if (!spec) continue;
      const allowed = collectValidFlags(spec);
      for (const token of command.split(/\s+/)) {
        if (!token.startsWith("--")) continue;
        const flag = token.split("=").at(0) ?? token;
        expect(allowed.has(flag), `unknown flag ${flag} in: ${command}`).toBe(
          true,
        );
      }
    }
  });
});

/**
 * One curated read: its documented form, the verb key it must route to, and the
 * param bag the real parser must derive from {@link ReadCase.command} (the
 * oracle Tier 2 asserts the parse against before executing).
 */
interface ReadCase {
  readonly command: string;
  readonly key: string;
  readonly params: Record<string, unknown>;
}

/** Reads that can run storelessly or against the canonical fixture graph. */
const READ_CASES: readonly ReadCase[] = [
  { command: "pragma block list", key: "block list", params: {} },
  {
    command: "pragma block lookup Button",
    key: "block lookup",
    params: { name: ["Button"] },
  },
  { command: "pragma standard list", key: "standard list", params: {} },
  { command: "pragma token list", key: "token list", params: {} },
  { command: "pragma tier list", key: "tier list", params: {} },
  { command: "pragma ontology list", key: "ontology list", params: {} },
  { command: "pragma config show", key: "config show", params: {} },
  { command: "pragma sources status", key: "sources status", params: {} },
  { command: "pragma doctor", key: "doctor", params: {} },
  { command: "pragma info", key: "info", params: {} },
  { command: "pragma capabilities", key: "capabilities", params: {} },
  { command: "pragma colophon", key: "colophon", params: {} },
];

const NO_MUTATION = { dryRun: false, undo: false, yes: false };

/**
 * Thrown by the capture hook to halt a parse at the resolved verb — before the
 * real dispatch (and its runtime boot) fires — carrying the routed path plus the
 * Commander-parsed operands and options.
 */
class ParsedCommand extends Error {
  constructor(
    readonly path: readonly string[],
    readonly positionals: string[],
    readonly opts: Record<string, unknown>,
  ) {
    super("parsed");
  }
}

/**
 * Parse a documented `pragma …` line through the REAL CLI grammar and return the
 * verb it routes to plus the coerced param bag {@link extractParams} derives —
 * WITHOUT running it. A `preAction` hook captures the resolved command and
 * throws before its action, so no runtime boots. Deriving the bag from the
 * STRING (rather than hand-supplying it) is what closes the Tier-2 gap: a
 * documented positional in the wrong slot now yields a different bag, instead of
 * a hand-fed bag masking the mistake.
 *
 * @param command - The documented `pragma …` command line.
 * @returns The routed verb key, its spec, and the parser-derived param bag.
 */
async function parseDocumented(
  command: string,
): Promise<{ key: string; spec: VerbSpec; params: Record<string, unknown> }> {
  const program = projectCli(capabilities);
  program.hook("preAction", (_root, action) => {
    const parentName = action.parent?.name();
    const routed =
      parentName !== undefined && parentName !== "pragma"
        ? [parentName, action.name()]
        : [action.name()];
    throw new ParsedCommand(routed, [...action.args], action.opts());
  });

  const argv = command.split(/\s+/).slice(1); // drop the leading `pragma`
  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (!(error instanceof ParsedCommand)) throw error;
    const key = error.path.join(" ");
    const spec = specByKey.get(key);
    if (spec === undefined) {
      throw new Error(`documented command routed to unknown verb: ${key}`);
    }
    return {
      key,
      spec,
      params: extractParams(spec.params, error.positionals, error.opts),
    };
  }
  throw new Error(`documented command reached no verb action: ${command}`);
}

describe("doc examples — Tier 2: curated read commands run green", () => {
  let fixture: Awaited<ReturnType<typeof bootFixtureRuntime>> | undefined;
  const documented = new Set(commands);

  beforeAll(async () => {
    fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: CANONICAL_CONFIG,
    });
  });

  afterAll(async () => {
    await fixture?.dispose();
  });

  for (const readCase of READ_CASES) {
    it(`\`${readCase.command}\` parses to its verb and exits 0`, async () => {
      expect(
        documented.has(readCase.command),
        `not documented: ${readCase.command}`,
      ).toBe(true);

      // Derive the verb + param bag from the DOCUMENTED string via the real
      // grammar, then assert both against the oracle: a mis-slotted positional
      // would route elsewhere or yield a different bag, failing here.
      const parsed = await parseDocumented(readCase.command);
      expect(parsed.key, `routed to the wrong verb: ${readCase.command}`).toBe(
        readCase.key,
      );
      expect(
        parsed.params,
        `parsed bag ≠ expected for: ${readCase.command}`,
      ).toEqual(readCase.params);

      if (!fixture) return;
      const outcome = await executeVerb(
        parsed.spec,
        parsed.params,
        NO_MUTATION,
        fixture.runtime,
      );
      expect(
        outcome.exitCode,
        `${readCase.command} → ${outcome.stderr ?? ""}`,
      ).toBe(0);
    });
  }
});
