/**
 * The conformance suite's own tests.
 *
 * The suite is what other packages assert WITH, so a bug in it reads as a false
 * pass in both binaries at once — the worst possible failure mode for a shared
 * guarantee. It is therefore exercised here on a self-contained generator this
 * file declares (no fixture generator is imported from a consumer: summon-core
 * sits below both bins and must not reach up).
 *
 * What is proven: a snapshot is the tree's files in sorted order and nothing
 * else; a diff names each way two trees can diverge; and `produceReference`
 * really does run the seam — it writes the generator's files AND stamps them,
 * into a directory it can be told about or one it makes itself.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { info, mkdir, sequence_, when, writeFile } from "@canonical/task";
import { describe, expect, it } from "vitest";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import { diffTrees, formatTreeDiff, isIdentical } from "./diffTrees.js";
import { CONFORMANCE_FIXTURES, fixture } from "./fixtures.js";
import { produceReference } from "./produceReference.js";
import { snapshotTree } from "./snapshotTree.js";

interface DemoAnswers {
  readonly dir: string;
  readonly withExtra: boolean;
  readonly [key: string]: unknown;
}

/** A tiny generator owned by this test — enough shape to exercise the seam. */
const demo: GeneratorDefinition<DemoAnswers> = {
  meta: {
    name: "demo",
    displayName: "conformance:demo",
    description: "A generator that exists only to test the conformance suite.",
    version: "1.2.3",
  },
  prompts: [
    { name: "dir", type: "text", message: "Directory:", default: "out" },
    {
      name: "withExtra",
      type: "confirm",
      message: "Write the extra file?",
      default: false,
    },
  ],
  generate: (answers) =>
    sequence_([
      // A Log effect, so the reference run's `onLog` sink is exercised: a
      // generator that logs must not print through a conformance run.
      info(`generating into ${answers.dir}`),
      mkdir(answers.dir),
      writeFile(join(answers.dir, "main.ts"), "export const answer = 42;\n"),
      when(
        answers.withExtra,
        writeFile(
          join(answers.dir, "extra.ts"),
          "export const extra = true;\n",
        ),
      ),
    ]),
};

/** A directory tree written directly, for the snapshot/diff unit cases. */
function writeTree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "conformance-unit-"));
  for (const [rel, content] of Object.entries(files)) {
    const segments = rel.split("/");
    if (segments.length > 1) {
      mkdirSync(join(root, ...segments.slice(0, -1)), { recursive: true });
    }
    writeFileSync(join(root, rel), content);
  }
  return root;
}

describe("snapshotTree", () => {
  it("reads every file below the root, keyed by POSIX-style relative path", () => {
    const root = writeTree({
      "b.txt": "second",
      "a.txt": "first",
      "nested/deep/c.txt": "third",
    });
    const tree = snapshotTree(root);
    expect([...tree.keys()]).toEqual(["a.txt", "b.txt", "nested/deep/c.txt"]);
    expect(tree.get("nested/deep/c.txt")).toBe("third");
  });

  it("records files only — an empty directory is not part of the tree", () => {
    const root = writeTree({ "kept.txt": "x" });
    mkdirSync(join(root, "empty"), { recursive: true });
    expect([...snapshotTree(root).keys()]).toEqual(["kept.txt"]);
  });
});

describe("diffTrees", () => {
  const base = snapshotTree(writeTree({ "a.txt": "1", "b.txt": "2" }));

  it("reports no divergence for two equal trees", () => {
    const same = snapshotTree(writeTree({ "a.txt": "1", "b.txt": "2" }));
    const diff = diffTrees(base, same);
    expect(diff).toEqual({
      onlyInFirst: [],
      onlyInSecond: [],
      differingContent: [],
    });
    expect(isIdentical(diff)).toBe(true);
    expect(formatTreeDiff(diff, "first", "second")).toBe("");
  });

  it("names a path only the first tree wrote", () => {
    const fewer = snapshotTree(writeTree({ "a.txt": "1" }));
    const diff = diffTrees(base, fewer);
    expect(diff.onlyInFirst).toEqual(["b.txt"]);
    expect(isIdentical(diff)).toBe(false);
    expect(formatTreeDiff(diff, "pragma", "summon")).toBe(
      "only pragma wrote: b.txt",
    );
  });

  it("names a path only the second tree wrote", () => {
    const more = snapshotTree(
      writeTree({ "a.txt": "1", "b.txt": "2", "c.txt": "3" }),
    );
    const diff = diffTrees(base, more);
    expect(diff.onlyInSecond).toEqual(["c.txt"]);
    expect(formatTreeDiff(diff, "pragma", "summon")).toBe(
      "only summon wrote: c.txt",
    );
  });

  it("names a path both wrote with different contents", () => {
    const changed = snapshotTree(writeTree({ "a.txt": "1", "b.txt": "TWO" }));
    const diff = diffTrees(base, changed);
    expect(diff.differingContent).toEqual(["b.txt"]);
    expect(formatTreeDiff(diff, "pragma", "summon")).toBe(
      "contents differ: b.txt",
    );
  });

  it("reports all three divergences together, each sorted", () => {
    const wide = snapshotTree(
      writeTree({ "a.txt": "CHANGED", "z.txt": "new" }),
    );
    const diff = diffTrees(base, wide);
    expect(diff).toEqual({
      onlyInFirst: ["b.txt"],
      onlyInSecond: ["z.txt"],
      differingContent: ["a.txt"],
    });
    expect(formatTreeDiff(diff, "pragma", "summon").split("\n")).toEqual([
      "only pragma wrote: b.txt",
      "only summon wrote: z.txt",
      "contents differ: a.txt",
    ]);
  });
});

describe("produceReference — the seam definition", () => {
  it("runs execute + autoPrompt + runGeneratorTask, and STAMPS what it writes", async () => {
    const tree = await produceReference({
      generator: demo,
      answers: { dir: "out", withExtra: false },
    });
    expect([...tree.keys()]).toEqual(["out/main.ts"]);
    const main = tree.get("out/main.ts") ?? "";
    expect(main).toContain("export const answer = 42;");
    // The stamp is what makes this a SEAM definition rather than a bare
    // generator run: a bin that skipped it would produce a different byte.
    expect(main).toContain("conformance:demo");
    expect(main).toContain("1.2.3");
  });

  it("answers every prompt from the fixture — no interaction, and conditionals honoured", async () => {
    const tree = await produceReference({
      generator: demo,
      answers: { dir: "out", withExtra: true },
    });
    expect([...tree.keys()]).toEqual(["out/extra.ts", "out/main.ts"]);
  });

  it("generates into a caller-supplied directory when given one", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "conformance-explicit-"));
    const tree = await produceReference({
      generator: demo,
      answers: { dir: "out", withExtra: false },
      cwd,
    });
    // Same directory, read independently: the run really used the cwd it was
    // handed rather than a temp dir of its own.
    expect(snapshotTree(cwd)).toEqual(tree);
  });

  it("is deterministic: two runs of one fixture are byte-identical", async () => {
    const answers = { dir: "out", withExtra: true };
    const first = await produceReference({ generator: demo, answers });
    const second = await produceReference({ generator: demo, answers });
    expect(isIdentical(diffTrees(first, second))).toBe(true);
  });
});

describe("fixtures", () => {
  it("carries answers ONLY — no fixture reaches up for a generator", () => {
    for (const entry of CONFORMANCE_FIXTURES) {
      expect(entry.name).toBeTruthy();
      expect(entry.generator).toBeTruthy();
      expect(Object.keys(entry.answers).length).toBeGreaterThan(0);
    }
    expect(CONFORMANCE_FIXTURES.map((entry) => entry.name)).toEqual([
      "component/react",
      "component/svelte",
      "component/lit",
      "package",
      "application",
    ]);
  });

  it("looks a fixture up by name", () => {
    expect(fixture("package").generator).toBe("package");
  });

  it("throws on an unknown name rather than silently skipping a case", () => {
    expect(() => fixture("no-such-fixture")).toThrow(
      'no conformance fixture named "no-such-fixture"',
    );
  });
});
