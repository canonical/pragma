/**
 * PROTECTED — the cross-CLI conformance matrix: for every declared generator
 * binding, THREE producers make the same tree from the same answers, byte for
 * byte —
 *
 *   (1) the shipped `dist/src/bin.js` entry (`pragma create <path…>`),
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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
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
import { blankCanonicalRanges } from "../../testing/helpers/blankCanonicalRanges.js";
import { CREATE_GENERATORS } from "./constants.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../../..");
/**
 * The shipped pragma entry. Spawned as `node <entry>` because the distribution
 * emits JavaScript rather than a self-executing binary — so every call site
 * below passes the entry as the runtime's FIRST argument.
 */
const pragmaEntry = join(repoRoot, "packages/cli/pragma/dist/src/bin.js");
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
  execFileSync(process.execPath, [pragmaEntry, "create", ...args], {
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

/**
 * Spawn either bin for `--help` (never throws). Returns the combined text
 * AND the exit status: a help page that stopped exiting 0 is a break the
 * text comparison alone cannot see (a blanket exit-2 classification keeps
 * the bytes identical).
 */
function helpOf(
  bin: "pragma" | "summon",
  path: readonly string[],
): { text: string; status: number | null } {
  const cwd = freshCwd("crosscli-help-");
  const result =
    bin === "pragma"
      ? spawnSync(
          process.execPath,
          [pragmaEntry, "create", ...path, "--help"],
          {
            cwd,
            encoding: "utf-8",
            input: "",
          },
        )
      : spawnSync(
          "bun",
          [summonBin, "--generators", generatorsDir, ...path, "--help"],
          { cwd, encoding: "utf-8", input: "" },
        );
  return {
    text: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    status: result.status,
  };
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
  // The matrix is COMPLETE by declaration, not by convention: the two loops
  // below iterate the shared fixture list (a literal in summon-core, whose
  // own docblock says the ids are "conventional, not enforced"), so a SIXTH
  // declared binding path would otherwise add zero byte-equality and
  // help-parity cells, silently, while this describe's header claims "every
  // declared generator binding". This cell closes the loop — and makes
  // `commandPathOf`'s `paths[0]` narrowing explicit: the sort-equality holds
  // only while every path of a multi-path binding is named by a fixture in
  // full (a second `application/*` path with a bare-id fixture would redden
  // here, which is the point).
  it("every declared generator binding path is driven by a conformance fixture", () => {
    expect(
      [...CONFORMANCE_FIXTURES]
        .map((fixture) => commandPathOf(fixture.generator))
        .sort(),
    ).toEqual(
      Object.values(CREATE_GENERATORS)
        .flatMap((binding) => binding.paths as readonly string[])
        .sort(),
    );
  });

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

      let pragma = producePragma(args);
      let summon = produceSummonBin(args);
      let reference = await produceReference({
        generator,
        answers: fixture.answers,
      });

      // The application fixture resolves its @canonical/* range through
      // THREE independent `npm view` calls (one per producer); an
      // asymmetric registry outcome is an 11-range spurious red, so the
      // ranges are blanked identically on all three snapshots — this cell
      // proves the template surface, the offline cells own range truth.
      if (fixture.name === "application") {
        pragma = blankCanonicalRanges(pragma);
        summon = blankCanonicalRanges(summon);
        reference = blankCanonicalRanges(reference);
      }

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
      const { text: pragmaHelp, status: pragmaStatus } = helpOf("pragma", path);
      const { text: summonHelp, status: summonStatus } = helpOf("summon", path);

      // An informational exit stays 0 on BOTH bins — the classification
      // branch nothing else in this suite observes.
      expect(pragmaStatus).toBe(0);
      expect(summonStatus).toBe(0);

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
  // refuses in BOTH bins with the same message and exit 2. Host framing
  // exists ONLY under pragma's explicitly requested `--format json`/`--format
  // llm` — never requested here — so picking the refusal line is a
  // convenience, not a normalization; the full-stderr cell below pins the
  // stronger byte fact for the default piped mode.
  const refusalLine = (stderr: string): string | undefined =>
    stderr.split("\n").find((line) => line.startsWith("Refusing to scaffold"));

  for (const commandPath of Object.values(CREATE_GENERATORS).flatMap(
    (binding) => binding.paths,
  )) {
    it(`${commandPath}: both bins refuse a bare non-TTY leaf with the same bytes, exit 2`, () => {
      const path = commandPath.split("/");
      const pragma = spawnSync(
        process.execPath,
        [pragmaEntry, "create", ...path],
        {
          cwd: freshCwd("crosscli-refuse-"),
          encoding: "utf-8",
          input: "",
        },
      );
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

  // The retired ssr/router pair: `application/react` no longer declares the
  // two prompts (SSR and the router are always-on facts — the old guard
  // rejected the ONLY explicit spelling the refusal could name, a closed
  // loop), so `--no-ssr` is an unknown option — Commander's DEFAULT usage
  // error, byte-identical in both hosts (contract §2), exit 2, nothing
  // written. The typed GENERATOR_INVALID_ANSWER pathway the guard used to
  // exercise stays covered per-host by fixture generators
  // (kernel/error/fromTaskError.test.ts, cli/summon's
  // App.invalidAnswer.test.tsx + interaction.subprocess.test.ts) — no
  // shipped generator raises it today.
  it("application/react: the retired --no-ssr is an unknown option with IDENTICAL bytes in both hosts, exit 2, nothing written", () => {
    // Full-stderr compare, so — as in every sibling whole-buffer cell —
    // pragma's one-time first-run note (stderr by design) is kept off by
    // seeding the global config it would otherwise create; unseeded, the
    // cell is green only while an EARLIER cell in this file has already
    // spent the note (red under `-t` isolation).
    const configHome = mkdtempSync(join(tmpdir(), "crosscli-cfg-"));
    mkdirSync(join(configHome, "pragma"));
    writeFileSync(join(configHome, "pragma", "config.json"), "{}\n");
    const pragmaCwd = freshCwd("crosscli-guard-");
    const pragma = spawnSync(
      process.execPath,
      [
        pragmaEntry,
        "create",
        "application",
        "react",
        "my-app",
        "--no-ssr",
        "--dry-run",
      ],
      {
        cwd: pragmaCwd,
        encoding: "utf-8",
        input: "",
        env: { ...process.env, XDG_CONFIG_HOME: configHome },
      },
    );
    expect(pragma.status).toBe(2);
    expect(pragma.stderr).toContain("error: unknown option '--no-ssr'");
    expect(readdirSync(pragmaCwd)).toEqual([]);

    const summonCwd = freshCwd("crosscli-guard-");
    const summon = spawnSync(
      "bun",
      [
        summonBin,
        "--generators",
        generatorsDir,
        "application",
        "react",
        "my-app",
        "--no-ssr",
        "--dry-run",
      ],
      { cwd: summonCwd, encoding: "utf-8", input: "" },
    );
    expect(summon.status).toBe(2);
    expect(summon.stderr).toBe(pragma.stderr);
    expect(readdirSync(summonCwd)).toEqual([]);
  }, 60_000);

  // The same refusal for an invalid EXPLICIT answer under `--yes` (run mode):
  // validation runs before any UI or write in both hosts — downstream of the
  // refuse decision (parity-contract §3) — so neither may scaffold a tree
  // carrying the invalid value. Before the hoist, summon validated only in
  // the batch arms — `--dry-run` refused while a plain `--yes` run scaffolded
  // `./Bad Name!/` with the broken name in its package.json.
  const invalidValueLine = (stderr: string): string | undefined =>
    stderr.split("\n").find((line) => line.startsWith("Invalid --"));

  it("package: an invalid explicit --name under --yes refuses in both bins with the same line, exit 2, nothing written", () => {
    const args = [
      "package",
      "--name",
      "Bad Name!",
      "--type",
      "library",
      "--description",
      "A library.",
      "--no-run-install",
      "--yes",
    ];
    const pragmaCwd = freshCwd("crosscli-invalid-");
    const pragma = spawnSync(
      process.execPath,
      [pragmaEntry, "create", ...args],
      {
        cwd: pragmaCwd,
        encoding: "utf-8",
        input: "",
      },
    );
    expect(pragma.status).toBe(2);
    expect(pragma.stderr).toContain("INVALID_INPUT");
    const pragmaInvalid = invalidValueLine(pragma.stderr ?? "");
    expect(pragmaInvalid).toBeDefined();
    expect(pragmaInvalid).toContain('Invalid --name "Bad Name!"');
    expect(readdirSync(pragmaCwd)).toEqual([]);

    const summonCwd = freshCwd("crosscli-invalid-");
    const summon = spawnSync(
      "bun",
      [summonBin, "--generators", generatorsDir, ...args],
      { cwd: summonCwd, encoding: "utf-8", input: "" },
    );
    expect(summon.status).toBe(2);
    // The bare shared line is summon's WHOLE stderr — byte-stable with the
    // batch arms' wording, and byte-agreeing with pragma's core message.
    expect(summon.stderr).toBe(`${pragmaInvalid}\n`);
    expect(readdirSync(summonCwd)).toEqual([]);
  }, 60_000);

  // An output path that ESCAPES the invocation cwd fails the SHARED
  // prompt-validate gate in both hosts: `appPath`'s own `validate` (like
  // `componentPath`'s) rejects `..` traversal and absolute paths, so the two
  // bins agree on the validation line, exit 2, and write NOTHING — before
  // the fix summon exited 0 and scaffolded 75 entries outside the workspace
  // where pragma's SEC-2 jail refused. The jail is now the host-level
  // backstop behind this shared tier; its symlink-resolution check stays
  // pragma-only (parity-contract §3, a named follow-up — deliberately no
  // cell pins that divergence).
  it("application/react: a ../ escape fails the shared validator in both bins — exit 2, nothing written outside", () => {
    const args = [
      "application",
      "react",
      "../outside/app",
      "--yes",
      "--no-run-install",
    ];
    const pragmaBase = freshCwd("crosscli-escape-");
    mkdirSync(join(pragmaBase, "inner"));
    const pragma = spawnSync(
      process.execPath,
      [pragmaEntry, "create", ...args],
      {
        cwd: join(pragmaBase, "inner"),
        encoding: "utf-8",
        input: "",
      },
    );
    expect(pragma.status).toBe(2);
    expect(pragma.stderr).toContain("INVALID_INPUT");
    const pragmaInvalid = invalidValueLine(pragma.stderr ?? "");
    expect(pragmaInvalid).toBeDefined();
    expect(pragmaInvalid).toContain('Invalid --app-path "../outside/app"');
    expect(readdirSync(pragmaBase)).toEqual(["inner"]);
    expect(readdirSync(join(pragmaBase, "inner"))).toEqual([]);

    const summonBase = freshCwd("crosscli-escape-");
    mkdirSync(join(summonBase, "inner"));
    const summon = spawnSync(
      "bun",
      [summonBin, "--generators", generatorsDir, ...args],
      { cwd: join(summonBase, "inner"), encoding: "utf-8", input: "" },
    );
    expect(summon.status).toBe(2);
    expect(summon.stderr).toBe(`${pragmaInvalid}\n`);
    expect(readdirSync(summonBase)).toEqual(["inner"]);
    expect(readdirSync(join(summonBase, "inner"))).toEqual([]);
  }, 60_000);

  it("application/react: an absolute path fails the shared validator in both bins — exit 2, target never created", () => {
    const target = join(freshCwd("crosscli-escape-abs-"), "abs-app");
    const args = ["application", "react", target, "--yes", "--no-run-install"];
    const pragmaCwd = freshCwd("crosscli-escape-");
    const pragma = spawnSync(
      process.execPath,
      [pragmaEntry, "create", ...args],
      {
        cwd: pragmaCwd,
        encoding: "utf-8",
        input: "",
      },
    );
    expect(pragma.status).toBe(2);
    expect(pragma.stderr).toContain("INVALID_INPUT");
    const pragmaInvalid = invalidValueLine(pragma.stderr ?? "");
    expect(pragmaInvalid).toBeDefined();
    expect(pragmaInvalid).toContain(`Invalid --app-path "${target}"`);
    expect(existsSync(target)).toBe(false);
    expect(readdirSync(pragmaCwd)).toEqual([]);

    const summonCwd = freshCwd("crosscli-escape-");
    const summon = spawnSync(
      "bun",
      [summonBin, "--generators", generatorsDir, ...args],
      { cwd: summonCwd, encoding: "utf-8", input: "" },
    );
    expect(summon.status).toBe(2);
    expect(summon.stderr).toBe(`${pragmaInvalid}\n`);
    expect(existsSync(target)).toBe(false);
    expect(readdirSync(summonCwd)).toEqual([]);
  }, 60_000);

  it("component/react: the DEFAULT piped refusal matches on FULL stderr — no envelope on either side", () => {
    // The whole stream, not a picked line: with the refusal line as the only
    // bytes either bin writes, a framing line appearing on EITHER side breaks
    // this cell. Pragma's one-time first-run note (stderr by design) is kept
    // off by seeding the global config it would otherwise create.
    const configHome = mkdtempSync(join(tmpdir(), "crosscli-cfg-"));
    mkdirSync(join(configHome, "pragma"));
    writeFileSync(join(configHome, "pragma", "config.json"), "{}\n");
    const pragma = spawnSync(
      process.execPath,
      [pragmaEntry, "create", "component", "react"],
      {
        cwd: freshCwd("crosscli-refuse-"),
        encoding: "utf-8",
        input: "",
        env: { ...process.env, XDG_CONFIG_HOME: configHome },
      },
    );
    const summon = spawnSync(
      "bun",
      [summonBin, "--generators", generatorsDir, "component", "react"],
      { cwd: freshCwd("crosscli-refuse-"), encoding: "utf-8", input: "" },
    );
    expect(pragma.status).toBe(2);
    expect(summon.status).toBe(2);
    expect(pragma.stderr.startsWith("Refusing to scaffold")).toBe(true);
    expect(pragma.stderr).toBe(summon.stderr);
  }, 60_000);

  // The refuse row WINS over invalid input: an invalid explicit answer with
  // an INCOMPLETE answer set, non-TTY, no mode flag, must refuse — not
  // validate first. Pragma's mount decides (and refuses) before the create
  // runtime loads, so it CANNOT validate first; summon mirrors that order.
  // One vector per invalid-value class (validateAnswers has exactly two):
  // component/react drives a `validate` rejection (that leaf has no select),
  // package drives a value outside a select's choices. Full stderr, nothing
  // written, in both.
  const refuseRowVectors: ReadonlyArray<{
    name: string;
    args: readonly string[];
  }> = [
    // `not-pascal` fails componentPath's own `validate`; the three confirm
    // answers are missing, so the run is incomplete — the refuse row.
    {
      name: "component/react (validate class)",
      args: ["component", "react", "not-pascal"],
    },
    // `bogus` sits outside packageType's choices; name/description are
    // missing, so the run is incomplete — the refuse row wins here too.
    { name: "package (select class)", args: ["package", "--type", "bogus"] },
  ];

  for (const vector of refuseRowVectors) {
    it(`${vector.name}: an invalid explicit answer with INCOMPLETE input refuses — full stderr byte-identical, exit 2`, () => {
      const configHome = mkdtempSync(join(tmpdir(), "crosscli-cfg-"));
      mkdirSync(join(configHome, "pragma"));
      writeFileSync(join(configHome, "pragma", "config.json"), "{}\n");
      const pragmaCwd = freshCwd("crosscli-refuse-");
      const pragma = spawnSync(
        process.execPath,
        [pragmaEntry, "create", ...vector.args],
        {
          cwd: pragmaCwd,
          encoding: "utf-8",
          input: "",
          env: { ...process.env, XDG_CONFIG_HOME: configHome },
        },
      );
      const summonCwd = freshCwd("crosscli-refuse-");
      const summon = spawnSync(
        "bun",
        [summonBin, "--generators", generatorsDir, ...vector.args],
        { cwd: summonCwd, encoding: "utf-8", input: "" },
      );
      expect(pragma.status).toBe(2);
      expect(summon.status).toBe(2);
      expect(pragma.stderr.startsWith("Refusing to scaffold")).toBe(true);
      expect(pragma.stderr).not.toContain("Invalid --");
      expect(pragma.stderr).toBe(summon.stderr);
      expect(readdirSync(pragmaCwd)).toEqual([]);
      expect(readdirSync(summonCwd)).toEqual([]);
    }, 60_000);
  }

  // The last unaligned member of Commander's usage-error trio: the shared
  // excess-positional path and the bare-namespace help already agree; an
  // unknown option exited 2 in pragma (its bin maps every parse failure)
  // but 1 in summon (no exitOverride — Commander's own code stood).
  it("component/react: an unknown option exits 2 in BOTH bins with the same error line", () => {
    // Seed pragma's global config (as the full-stderr cells do) so its
    // one-time first-run note does not precede the error line.
    const configHome = mkdtempSync(join(tmpdir(), "crosscli-cfg-"));
    mkdirSync(join(configHome, "pragma"));
    writeFileSync(join(configHome, "pragma", "config.json"), "{}\n");
    const args = ["component", "react", "src/components/Foo", "--bogus"];
    const pragma = spawnSync(
      process.execPath,
      [pragmaEntry, "create", ...args],
      {
        cwd: freshCwd("crosscli-unknown-"),
        encoding: "utf-8",
        input: "",
        env: { ...process.env, XDG_CONFIG_HOME: configHome },
      },
    );
    const summon = spawnSync(
      "bun",
      [summonBin, "--generators", generatorsDir, ...args],
      { cwd: freshCwd("crosscli-unknown-"), encoding: "utf-8", input: "" },
    );
    expect(pragma.status).toBe(2);
    expect(summon.status).toBe(2);
    const line = "error: unknown option '--bogus'";
    expect(pragma.stderr.split("\n")[0]).toBe(line);
    expect(summon.stderr.split("\n")[0]).toBe(line);
  }, 60_000);

  // The unknown NAMESPACE segment is ONE grammar in both hosts: the shared
  // `Did you mean '<chain> <segment>'?` form the excess-positional path
  // already uses, owned by the projection — pragma's mount no longer
  // re-implements the line and summon no longer falls to Commander's
  // `(Did you mean react?)`. Full stderr per host: only the chain differs,
  // naming each host's real invocation.
  it("component reakt: the unknown-segment error carries the SHARED did-you-mean in both bins, exit 2", () => {
    const configHome = mkdtempSync(join(tmpdir(), "crosscli-cfg-"));
    mkdirSync(join(configHome, "pragma"));
    writeFileSync(join(configHome, "pragma", "config.json"), "{}\n");
    const pragma = spawnSync(
      process.execPath,
      [pragmaEntry, "create", "component", "reakt"],
      {
        cwd: freshCwd("crosscli-unknown-"),
        encoding: "utf-8",
        input: "",
        env: { ...process.env, XDG_CONFIG_HOME: configHome },
      },
    );
    const summon = spawnSync(
      "bun",
      [summonBin, "--generators", generatorsDir, "component", "reakt"],
      { cwd: freshCwd("crosscli-unknown-"), encoding: "utf-8", input: "" },
    );
    expect(pragma.status).toBe(2);
    expect(summon.status).toBe(2);
    expect(pragma.stderr).toBe(
      "error: unknown command 'reakt'\n" +
        "Did you mean 'pragma create component react'?\n",
    );
    expect(summon.stderr).toBe(
      "error: unknown command 'reakt'\n" +
        "Did you mean 'summon component react'?\n",
    );
  }, 60_000);
});
