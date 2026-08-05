/**
 * The conformance kit run against ITSELF — the core's own third consumer.
 *
 * `packages/cli/pragma` and `packages/cli/summon` each drive this fixture
 * through their own execution composition. This file drives it through the
 * core's, which does two things neither of those can: it proves the reference
 * tree in `CONFORMANCE_TREE` is producible AT ALL (a golden nobody can reach is
 * a golden that fails every consumer for the wrong reason), and it exercises
 * `assertByteEqual`'s failure branches, which a passing consumer never reaches.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import execute from "../../execute/execute.js";
import autoPrompt from "../../prompt/autoPrompt.js";
import runGeneratorTask from "../../run/runGeneratorTask.js";
import createGeneratorStamp from "../../stamp/createGeneratorStamp.js";
import createStampOnEffectStart from "../../stamp/createStampOnEffectStart.js";
import { conformanceGenerator } from "./conformanceGenerator.js";
import { CONFORMANCE_ANSWERS, CONFORMANCE_TREE } from "./constants.js";
import { assertByteEqual, snapshotTree } from "./snapshotTree.js";

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "core-conf-"));

/** Produce the fixture through the core's own `execute` composition. */
async function produce(): Promise<Map<string, string>> {
  const dir = freshCwd();
  const answers = { ...CONFORMANCE_ANSWERS };
  await runGeneratorTask(
    execute(conformanceGenerator, {
      prompt: autoPrompt(answers),
      params: answers,
    }),
    {
      cwd: dir,
      promptHandler: autoPrompt(answers),
      onEffectStart: createStampOnEffectStart(
        createGeneratorStamp(conformanceGenerator),
      ),
      onLog: () => {},
    },
  );
  return snapshotTree(dir);
}

describe("the conformance fixture produces the written-down tree", () => {
  it("matches CONFORMANCE_TREE exactly", async () => {
    const tree = await produce();
    expect(() => assertByteEqual(tree, CONFORMANCE_TREE)).not.toThrow();
  });

  it("skips NOTES.md when the conditional prompt is answered false", async () => {
    // The `when`-gated file is the one part of the fixture the default answer
    // set cannot show is CONDITIONAL rather than unconditional.
    const dir = freshCwd();
    const answers = { ...CONFORMANCE_ANSWERS, withNotes: false };
    await runGeneratorTask(
      execute(conformanceGenerator, {
        prompt: autoPrompt(answers),
        params: answers,
      }),
      {
        cwd: dir,
        promptHandler: autoPrompt(answers),
        onEffectStart: createStampOnEffectStart(
          createGeneratorStamp(conformanceGenerator),
        ),
        onLog: () => {},
      },
    );
    expect([...snapshotTree(dir).keys()]).toEqual([
      "src/widget-factory/config.json",
      "src/widget-factory/index.ts",
    ]);
  });
});

describe("assertByteEqual reports the failure it is there to catch", () => {
  const expected = new Map([["a.txt", "one"]]);

  it("refuses an EMPTY reference — the degenerate agreement", () => {
    expect(() => assertByteEqual(new Map(), new Map())).toThrow(/EMPTY/);
  });

  it("names the path-set mismatch, both sides", () => {
    expect(() => assertByteEqual(new Map(), expected)).toThrow(
      /produced EMPTY, expected \[a\.txt\]/,
    );
    expect(() =>
      assertByteEqual(new Map([["b.txt", "one"]]), expected),
    ).toThrow(/produced \[b\.txt\], expected \[a\.txt\]/);
  });

  it("names the differing path and quotes both contents", () => {
    expect(() =>
      assertByteEqual(new Map([["a.txt", "two"]]), expected),
    ).toThrow(/a\.txt differs[\s\S]*two[\s\S]*one/);
  });
});

describe("snapshotTree", () => {
  it("walks nested directories and keys by relative POSIX path", () => {
    const dir = freshCwd();
    mkdirSync(join(dir, "nested", "deeper"), { recursive: true });
    writeFileSync(join(dir, "top.txt"), "top");
    writeFileSync(join(dir, "nested", "deeper", "leaf.txt"), "leaf");
    expect([...snapshotTree(dir).entries()]).toEqual([
      ["nested/deeper/leaf.txt", "leaf"],
      ["top.txt", "top"],
    ]);
  });
});
