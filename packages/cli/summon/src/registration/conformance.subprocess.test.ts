/**
 * PROTECTED — summon's side of the byte-equality seam.
 *
 * The guarantee is that both product binaries generate the same tree from the
 * same generator and the same answers. Until now that was asserted only from
 * PRAGMA's package: pragma's kernel path was diffed against summon-core's
 * `execute`, and this package had no tests at all (`--passWithNoTests`), so the
 * summon BIN — the Commander/Ink front-end over that same core — could drift
 * and nothing would catch it.
 *
 * This runs the real bin in its own PROCESS, exactly as a user does
 * (`summon example hello --name=… --yes`), and diffs its tree against
 * {@link produceReference} — the shared definition of the seam in
 * `@canonical/summon-core/testing`. Two generators are covered: `example/hello`
 * (templates, a conditional file, EJS helpers) and `init` (a nested output
 * path), the two the bin actually ships.
 *
 * Subprocess, not in-process, deliberately: the bin's write path goes through
 * Ink's `render`, and the risk being guarded is precisely that the front-end
 * adds or drops a byte around the core. A non-TTY child is the CI shape, and it
 * is the shape asserted here.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  diffTrees,
  formatTreeDiff,
  isIdentical,
  produceReference,
  snapshotTree,
  type TreeSnapshot,
} from "@canonical/summon-core/testing";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../..");
const summonBin = join(packageRoot, "src/bin.tsx");

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "summon-conf-"));

/** Producer (1): the real summon bin, run non-interactively in its own process. */
function produceBin(args: readonly string[]): TreeSnapshot {
  const cwd = freshCwd();
  execFileSync("bun", [summonBin, ...args, "--yes"], {
    cwd,
    stdio: "pipe",
    // A child with no stdin is the CI shape: `isTTY` is false, so the bin takes
    // its non-interactive path with the answers it was given on the flags.
    input: "",
  });
  return snapshotTree(cwd);
}

/** One case: the bin's argv, and the equivalent answers for the reference. */
interface Case {
  readonly name: string;
  readonly module: string;
  readonly args: readonly string[];
  readonly answers: Record<string, unknown>;
}

const cases: Case[] = [
  {
    name: "example/hello",
    module: "../../generators/example/hello/index.js",
    args: [
      "example",
      "hello",
      "--name=conformance-app",
      "--description=A conformance fixture.",
      "--greeting=Hey",
    ],
    answers: {
      name: "conformance-app",
      description: "A conformance fixture.",
      greeting: "Hey",
      withReadme: true,
    },
  },
  {
    name: "example/hello without the optional README",
    module: "../../generators/example/hello/index.js",
    args: [
      "example",
      "hello",
      "--name=terse-app",
      "--description=No readme.",
      "--greeting=Hi",
      "--no-with-readme",
    ],
    answers: {
      name: "terse-app",
      description: "No readme.",
      greeting: "Hi",
      withReadme: false,
    },
  },
  {
    name: "init",
    module: "../../generators/init/index.js",
    args: [
      "init",
      "--generator-path=component/vue",
      "--description=A vue generator.",
    ],
    answers: {
      generatorPath: "component/vue",
      description: "A vue generator.",
      outputDir: "./generators",
    },
  },
];

describe("byte-equality conformance — the summon bin ≡ the reference (PROTECTED)", () => {
  for (const testCase of cases) {
    it(`${testCase.name}: the bin's tree matches the reference byte for byte`, async () => {
      const bin = produceBin(testCase.args);
      const { generator } = (await import(testCase.module)) as {
        generator: Parameters<typeof produceReference>[0]["generator"];
      };
      const reference = await produceReference({
        generator,
        answers: testCase.answers,
      });
      expect(bin.size).toBeGreaterThan(0);
      const diff = diffTrees(bin, reference);
      expect(
        isIdentical(diff),
        formatTreeDiff(diff, "the summon bin", "the conformance reference"),
      ).toBe(true);
    }, 60_000);
  }
});
