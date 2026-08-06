/**
 * PROTECTED — the create surface's despecialization proof.
 *
 * THE PROGRAMME PROVES DESPECIALIZATION BY FORKING, so this does the same. It
 * builds a SECOND binary from a SECOND declaration
 * (`src/testing/fixtures/fork/pragma.conf.ts`, which names one generator package
 * this distribution does not ship) and asserts three things about it:
 *
 *  1. the fork binary HAS a `create monorepo` noun,
 *  2. it RUNS it — into an empty directory, from the compiled binary, writing
 *     the generator's real rendered output and not an empty tree,
 *  3. it does NOT carry the shipped nouns, and the shipped binary does not carry
 *     the fork's.
 *
 * (3) is what makes (1) and (2) mean something. A binary that carried every
 * generator in the workspace would pass (1) and (2) while proving nothing; the
 * asymmetry is the evidence that the DECLARATION — not the code — decided what
 * was linked. Nothing under `src/capabilities/create/` differs between the two
 * builds. The fork edits one file.
 *
 * WHY THIS IS A TEST AND NOT A TRANSCRIPT. `bun run scripts/build.ts` was
 * measured at ~1.4 s wall clock for the full codegen-plus-`--compile` cycle
 * (106 MB binary), so a standing guard costs a few seconds and cannot rot, where
 * a transcript in a PR body is true exactly once.
 *
 * WHY THE FORK CANNOT BE A FOURTH SHIPPED NOUN. `surfaceConformance` asserts the
 * emitted surface is a subset of `surface/surface.v2.json` with per-verb deep
 * equality, and the covenant blesses exactly `component`/`package`/
 * `application`. Declaring a fourth noun in THIS distribution's conf would fail
 * the frozen covenant — correctly. A fork is a different distribution, so it
 * gets a different binary, which is also how this programme proved identity
 * despecialization twice before.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const cliDir = resolve(here, "../../..");
const forkBin = join(cliDir, "dist/pragma-fork");
const shippedBin = join(cliDir, "dist/pragma");

/**
 * The noun the fork declares, and the one it does not. Spelled here rather than
 * read from the fixture: a test that derived the expectation from the same
 * declaration the build reads would agree with itself by construction.
 */
const FORK_NOUN = "monorepo";

/** The shipped distribution's nouns, which the fork binary must NOT carry. */
const SHIPPED_NOUNS = ["component", "package", "application"] as const;

/** Every `--format` a run may render in, so no formatter goes unexercised. */
const FORMATS = ["plain", "llm", "json"] as const;

/**
 * Whether `create --help` lists a noun as a VERB.
 *
 * A substring match will not do, and the wrong one was written first: the
 * shipped `package` summary reads "Scaffold a new npm package for the
 * monorepo.", so `help.includes("monorepo")` reports the fork's noun in the
 * shipped binary. Only the verb column counts.
 *
 * @param help - The rendered `create --help` output.
 * @param noun - The noun to look for.
 * @returns Whether the verb list offers it.
 */
function listsNoun(help: string, noun: string): boolean {
  return new RegExp(`^\\s+${noun}\\s{2,}\\S`, "m").test(help);
}

/** Read a directory tree into a sorted map of relative path → contents. */
function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string, base: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(d, entry.name), rel);
      else out.set(rel, readFileSync(join(d, entry.name), "utf-8"));
    }
  };
  walk(dir, "");
  return out;
}

beforeAll(() => {
  // Build the fork binary from the fork's declaration. `--fork` makes the conf a
  // PARAMETER of the build rather than an import of it: the generated modules
  // land beside the fork's `pragma.conf.ts` and are aliased at bundle time, so
  // this distribution's committed ones are never touched. Its own `--outfile`
  // keeps it out of `dist/pragma`, which the perf setup owns.
  execFileSync(
    "bun",
    [
      "run",
      "scripts/build.ts",
      "--fork",
      "src/testing/fixtures/fork",
      "--outfile",
      "dist/pragma-fork",
    ],
    { cwd: cliDir, stdio: "pipe" },
  );
  expect(existsSync(forkBin)).toBe(true);
}, 300_000);

describe("a fork declares its own create surface (PROTECTED)", () => {
  it(`publishes \`create ${FORK_NOUN}\` and none of the shipped nouns`, () => {
    const help = execFileSync(forkBin, ["create", "--help"], {
      encoding: "utf-8",
    });
    expect(listsNoun(help, FORK_NOUN), "fork lists its declared noun").toBe(
      true,
    );
    for (const noun of SHIPPED_NOUNS) {
      expect(
        listsNoun(help, noun),
        `fork help must not offer \`create ${noun}\``,
      ).toBe(false);
    }
  }, 60_000);

  it("the SHIPPED binary does not carry the fork's noun", () => {
    // The declaration cuts both ways or it decided nothing. `--format` is passed
    // explicitly because it auto-selects `llm` off a TTY, which would leave the
    // plain formatter — the one a user sees — unexercised.
    const run = spawnSync(
      shippedBin,
      ["create", FORK_NOUN, "--yes", "--format", "plain"],
      { cwd: mkdtempSync(join(tmpdir(), "pragma-fork-")), encoding: "utf-8" },
    );
    expect(run.status).not.toBe(0);
    const help = execFileSync(shippedBin, ["create", "--help"], {
      encoding: "utf-8",
    });
    expect(listsNoun(help, FORK_NOUN), "shipped must not carry it").toBe(false);
    for (const noun of SHIPPED_NOUNS) expect(listsNoun(help, noun)).toBe(true);
  }, 60_000);

  it("the fork's noun reaches the MCP catalog with its DECLARED hint", () => {
    // This case exists because the bug it pins actually shipped for one build.
    // `capabilities/hints.ts` derives the `create_*` hints from the surface
    // module, and it imports it from OUTSIDE `capabilities/create/` — so a fork
    // alias scoped by importing directory handed that one importer the SHIPPED
    // surface. The fork binary built, type-checked and ran while reporting its
    // own mutating noun as `category: "read"` with "(no hint authored)". A
    // half-aliased module graph fails nothing, so it has to be asserted.
    const raw = execFileSync(forkBin, ["capabilities", "--format", "json"], {
      encoding: "utf-8",
    });
    const found = [
      ...raw.matchAll(/\{[^{}]*"name":"create_[a-z]+"[^{}]*\}/g),
    ].map((match) => JSON.parse(match.at(0) ?? "{}") as Record<string, string>);
    expect(found.map((tool) => tool.name)).toEqual([`create_${FORK_NOUN}`]);
    // `category` is DERIVED (every create verb mutates) and cross-checked
    // against the verb's real `mutates` flag by the catalog's own drift guard.
    expect(found.at(0)?.category).toBe("write");
    // `use_when` is DECLARED, and the fixture's wording appears nowhere in this
    // distribution's conf — so reading it back is evidence the fork's
    // declaration reached the binary, not the shipped one.
    expect(found.at(0)?.use_when).toContain("monorepo shell");
    expect(raw).not.toContain("no hint authored");
  }, 60_000);

  for (const format of FORMATS) {
    it(`runs \`create ${FORK_NOUN}\` from the compiled fork binary (--format ${format})`, () => {
      const cwd = mkdtempSync(join(tmpdir(), "pragma-fork-"));
      const run = spawnSync(
        forkBin,
        [
          "create",
          FORK_NOUN,
          "--name",
          "proof-repo",
          "--yes",
          "--format",
          format,
        ],
        { cwd, encoding: "utf-8" },
      );
      expect(run.status, run.stderr).toBe(0);
      // The failure this whole slice exists to close reads `ENOENT … /$bunfs/…`
      // and leaves a half-made tree behind, so name it rather than only counting
      // files.
      expect(`${run.stdout}${run.stderr}`).not.toContain("ENOENT");

      const wrote = snapshot(cwd);
      expect(wrote.size).toBeGreaterThan(0);
      // Rendered, not copied: the scaffold's `package.json` carries the answer
      // the run supplied, which no embedded template can contain.
      const manifest = wrote.get("proof-repo/package.json");
      expect(manifest, "the scaffold's package.json").toBeDefined();
      expect(manifest).toContain("proof-repo");
      // Every one of the generator's 19 templates reached the disk. A binary
      // that could not read its embedded files would write a subset, which is
      // exactly how `create application` failed before the seam was fixed.
      expect(wrote.size).toBe(19);
    }, 120_000);
  }
});
