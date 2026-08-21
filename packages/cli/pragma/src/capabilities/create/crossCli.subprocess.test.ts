/**
 * PROTECTED — the cross-CLI conformance matrix: for every declared generator
 * binding, THREE producers make the same tree from the same answers, byte for
 * byte —
 *
 *   (1) the compiled `dist/pragma` binary (`pragma create <path…>`),
 *   (2) the REAL summon bin (`summon <path…>`, served the same generator
 *       packages through `--generators`), and
 *   (3) the conformance REFERENCE (`produceReference` — summon-core `execute`
 *       with `autoPrompt` and the shared stamp).
 *
 * NORMATIVE SOURCE: `packages/summon/core/docs/parity-contract.md` — the
 * grammar-derivation rules, the interaction table, and the parity flag set
 * this suite executes. Each producer's argv derives from the SAME fixture
 * answers via `flagizeAnswers`, so the vectors are identical modulo the
 * leading `create` — an argv hand-drift cannot fake parity.
 *
 * Help/flag parity is asserted over the PARITY SET (prompt-derived flags ∪
 * the mutation trio `--dry-run`/`--undo`/`--yes`): each host's declared
 * output extras sit outside the projection by design, and the generator-
 * options sections of the two `--help` pages must be byte-identical below
 * the host blocks. Wizard-script parity is asserted on the projection
 * (`pendingPrompts` fidelity, in summon-core), NOT by driving two TUIs.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONFORMANCE_FIXTURES,
  diffTrees,
  flagizeAnswers,
  formatTreeDiff,
  isIdentical,
  produceReference,
  snapshotTree,
  type TreeSnapshot,
} from "@canonical/summon-core/testing";
import { describe, expect, it } from "vitest";
import { CREATE_GENERATORS } from "./constants.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../../..");
const compiledBin = join(repoRoot, "packages/cli/pragma/dist/pragma");
const summonBin = join(repoRoot, "packages/cli/summon/src/bin.tsx");

const freshCwd = (prefix: string): string =>
  mkdtempSync(join(tmpdir(), prefix));

/**
 * A one-file barrel package the summon bin discovers via `--generators`: it
 * re-exports the three BUILT generator maps (`dist/esm`, exactly what a
 * published install serves), merged — so the summon producer runs the same
 * generator code the pragma binary bundles.
 */
function writeGeneratorFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "crosscli-generators-"));
  const dist = (pkg: string): string =>
    `file://${join(repoRoot, "packages/summon", pkg, "dist/esm/index.js")}`;
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "summon-crosscli-fixture", main: "index.js" }),
  );
  writeFileSync(
    join(dir, "index.js"),
    `import { generators as component } from ${JSON.stringify(dist("component"))};
import { generators as pkg } from ${JSON.stringify(dist("package"))};
import { generators as application } from ${JSON.stringify(dist("application"))};
export const generators = { ...component, ...pkg, ...application };
`,
  );
  return dir;
}

const generatorsDir = writeGeneratorFixture();

/** The declared command path a fixture's logical generator id names. */
function commandPathOf(fixtureGenerator: string): string {
  if (fixtureGenerator.includes("/")) return fixtureGenerator;
  const binding =
    CREATE_GENERATORS[fixtureGenerator as keyof typeof CREATE_GENERATORS];
  return (binding?.paths[0] ?? fixtureGenerator) as string;
}

/** Producer (1): the compiled pragma binary. */
function producePragma(args: readonly string[]): TreeSnapshot {
  const cwd = freshCwd("crosscli-pragma-");
  execFileSync(compiledBin, ["create", ...args], {
    cwd,
    stdio: "pipe",
    input: "",
  });
  return snapshotTree(cwd);
}

/** Producer (2): the real summon bin, served the same generators. */
function produceSummonBin(args: readonly string[]): TreeSnapshot {
  const cwd = freshCwd("crosscli-summon-");
  execFileSync("bun", [summonBin, "--generators", generatorsDir, ...args], {
    cwd,
    stdio: "pipe",
    input: "",
  });
  return snapshotTree(cwd);
}

/** Spawn either bin for `--help` (never throws). */
function helpOf(bin: "pragma" | "summon", path: readonly string[]): string {
  const cwd = freshCwd("crosscli-help-");
  const result =
    bin === "pragma"
      ? spawnSync(compiledBin, ["create", ...path, "--help"], {
          cwd,
          encoding: "utf-8",
          input: "",
        })
      : spawnSync(
          "bun",
          [summonBin, "--generators", generatorsDir, ...path, "--help"],
          { cwd, encoding: "utf-8", input: "" },
        );
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/** Every `--flag` token of a help page (dedup, sorted). */
function flagTokens(help: string): string[] {
  return [
    ...new Set([...help.matchAll(/--[a-z][a-z-]*/g)].map((m) => m[0])),
  ].sort();
}

/**
 * The generator-options sections of a grouped help page: everything below the
 * host's `Global Options:` block (the first group heading after it, to the
 * end). The usage/bin prefix and host flags live above, by construction.
 */
function generatorSections(help: string): string {
  const lines = help.split("\n");
  const globalAt = lines.indexOf("Global Options:");
  if (globalAt === -1) return help;
  let at = globalAt + 1;
  // Skip the host block: indented rows until the next blank line.
  while (at < lines.length && lines[at] !== "") at += 1;
  return lines.slice(at).join("\n").trimEnd();
}

/** The parity flag set: prompt-derived registered flags ∪ the mutation trio. */
async function paritySet(commandPath: string): Promise<Set<string>> {
  const [{ buildOptionInfo }, { pickGenerator }] = await Promise.all([
    import("@canonical/summon-core/projection"),
    import("./pickGenerator.js"),
  ]);
  const set = new Set(["--dry-run", "--undo", "--yes"]);
  for (const prompt of pickGenerator(commandPath).prompts) {
    // EVERY prompt registers a flag — the positional one is accepted both
    // ways (`component react src/X` ≡ `component react --component-path=…`).
    const token = buildOptionInfo(prompt).flags.split(" ")[0] as string;
    set.add(token);
  }
  return set;
}

/** Each host's declared standard extras, outside the projection by design. */
const SUMMON_EXTRAS = new Set([
  "--dry-run", // shared (short forms are host spellings of the same trio)
  "--undo",
  "--yes",
  "--verbose",
  "--show-files",
  "--no-preview",
  "--no-generated-stamp",
  "--llm",
  "--format",
  "--help",
]);
const PRAGMA_EXTRAS = new Set(["--dry-run", "--undo", "--yes", "--help"]);

describe("cross-CLI conformance matrix (PROTECTED)", () => {
  for (const fixture of CONFORMANCE_FIXTURES) {
    it(`${fixture.name}: summon bin ≡ pragma compiled binary ≡ the reference`, async () => {
      const commandPath = commandPathOf(fixture.generator);
      const { pickGenerator } = await import("./pickGenerator.js");
      const generator = pickGenerator(commandPath);

      // The one argv, derived from the shared answers.
      const args = [
        ...commandPath.split("/"),
        ...flagizeAnswers(generator.prompts, fixture.answers),
        "--yes",
      ];

      const pragma = producePragma(args);
      const summon = produceSummonBin(args);
      const reference = await produceReference({
        generator,
        answers: fixture.answers,
      });

      expect(pragma.size).toBeGreaterThan(0);

      const pragmaVsSummon = diffTrees(pragma, summon);
      expect(
        isIdentical(pragmaVsSummon),
        formatTreeDiff(pragmaVsSummon, "pragma compiled", "summon bin"),
      ).toBe(true);

      const pragmaVsReference = diffTrees(pragma, reference);
      expect(
        isIdentical(pragmaVsReference),
        formatTreeDiff(pragmaVsReference, "pragma compiled", "the reference"),
      ).toBe(true);
    }, 120_000);
  }

  for (const fixture of CONFORMANCE_FIXTURES) {
    it(`${fixture.name}: help/flag parity over the parity set + byte-equal generator sections`, async () => {
      const commandPath = commandPathOf(fixture.generator);
      const path = commandPath.split("/");
      const pragmaHelp = helpOf("pragma", path);
      const summonHelp = helpOf("summon", path);

      const parity = await paritySet(commandPath);

      const pragmaFlags = flagTokens(pragmaHelp).filter(
        (flag) => !PRAGMA_EXTRAS.has(flag),
      );
      const summonFlags = flagTokens(summonHelp).filter(
        (flag) => !SUMMON_EXTRAS.has(flag),
      );
      const expected = [...parity]
        .filter((flag) => !["--dry-run", "--undo", "--yes"].includes(flag))
        .sort();
      expect(pragmaFlags).toEqual(expected);
      expect(summonFlags).toEqual(expected);
      // The trio itself appears on both pages (host spellings aside).
      for (const flag of ["--dry-run", "--undo", "--yes"]) {
        expect(flagTokens(pragmaHelp)).toContain(flag);
        expect(flagTokens(summonHelp)).toContain(flag);
      }

      // The GENERATOR-OPTIONS sections are byte-identical below the host
      // blocks (same buildOptionInfo, same groups, same order).
      expect(generatorSections(pragmaHelp)).toBe(generatorSections(summonHelp));
    }, 60_000);
  }

  // The refusal cell (row 6) is shared byte for byte: a bare non-TTY leaf
  // refuses in BOTH bins with the same message and exit 2. Comparing only the
  // refusal line normalizes away any host framing around it (there is none
  // today — the message itself names no bin).
  const refusalLine = (stderr: string): string | undefined =>
    stderr.split("\n").find((line) => line.startsWith("Refusing to scaffold"));

  for (const commandPath of Object.values(CREATE_GENERATORS).flatMap(
    (binding) => binding.paths,
  )) {
    it(`${commandPath}: both bins refuse a bare non-TTY leaf with the same bytes, exit 2`, () => {
      const path = commandPath.split("/");
      const pragma = spawnSync(compiledBin, ["create", ...path], {
        cwd: freshCwd("crosscli-refuse-"),
        encoding: "utf-8",
        input: "",
      });
      const summon = spawnSync(
        "bun",
        [summonBin, "--generators", generatorsDir, ...path],
        { cwd: freshCwd("crosscli-refuse-"), encoding: "utf-8", input: "" },
      );
      expect(pragma.status).toBe(2);
      expect(summon.status).toBe(2);
      const pragmaRefusal = refusalLine(pragma.stderr ?? "");
      expect(pragmaRefusal).toBeDefined();
      expect(pragmaRefusal).toContain("Missing: --");
      expect(pragmaRefusal).toBe(refusalLine(summon.stderr ?? ""));
    }, 60_000);
  }
});
