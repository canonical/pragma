/**
 * The P.05 byte-equality gate: `pragma create X` and `summon X` must write
 * identical bytes for the same generator invocation.
 *
 * Both binaries reduce to compositions over the shared execution core:
 * pragma's batch path is `executeGenerator` (which stamps via
 * `createStampOnEffectStart`), and summon's Ink executor runs
 * `runGeneratorTask` with the same stamp transform and the defaults prompt
 * handler. This test runs both compositions over the real generators into
 * separate directories and asserts the trees are byte-identical — stamps
 * included.
 */

import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  answerPromptWithDefaults,
  createGeneratorStamp,
  createStampOnEffectStart,
  executeGenerator,
  runGeneratorTask,
} from "@canonical/cli-core";
import type { GeneratorDefinition } from "@canonical/summon-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COMPONENT_GENERATORS } from "../../domains/create/generators.js";

interface Case {
  readonly name: string;
  readonly gen: GeneratorDefinition;
  readonly answers: Record<string, unknown>;
}

const cases: Case[] = [
  {
    name: "component/react",
    gen: COMPONENT_GENERATORS.react as GeneratorDefinition,
    answers: { componentPath: "src/components/Button" },
  },
  {
    name: "package/library",
    gen: packageGenerators.package as GeneratorDefinition,
    answers: { name: "@canonical/example", type: "library" },
  },
];

/** Collect every file under root as relative path → raw content bytes. */
const readTree = (root: string, dir = root): Map<string, Buffer> => {
  const files = new Map<string, Buffer>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [k, v] of readTree(root, full)) files.set(k, v);
    } else {
      files.set(relative(root, full), readFileSync(full));
    }
  }
  return files;
};

describe("cross-binary byte equality — pragma create ≡ summon", () => {
  let dir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "byte-equality-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  for (const testCase of cases) {
    it(`${testCase.name} — both binaries write identical bytes, stamps included`, async () => {
      const pragmaDir = join(dir, "pragma");
      const summonDir = join(dir, "summon");
      mkdirSync(pragmaDir);
      mkdirSync(summonDir);

      // pragma path: the create command's batch execution (stamps by default).
      const result = await executeGenerator(
        testCase.gen,
        { ...testCase.answers, yes: true },
        {
          cwd: pragmaDir,
          globalFlags: { llm: false, format: "text", verbose: false },
        },
      );
      expect(result.tag).toBe("output");

      // summon path: the Ink executor's exact composition over the shared
      // core. Both binaries fold prompt defaults into the answers before
      // generating; do the same here.
      const answers = { ...testCase.answers };
      for (const prompt of testCase.gen.prompts) {
        if (!(prompt.name in answers) && prompt.default !== undefined) {
          answers[prompt.name] = prompt.default;
        }
      }
      await runGeneratorTask(testCase.gen.generate(answers), {
        cwd: summonDir,
        promptHandler: answerPromptWithDefaults,
        onEffectStart: createStampOnEffectStart(
          createGeneratorStamp(testCase.gen),
        ),
      });

      const pragmaTree = readTree(pragmaDir);
      const summonTree = readTree(summonDir);

      expect([...pragmaTree.keys()].sort()).toEqual(
        [...summonTree.keys()].sort(),
      );
      for (const [path, content] of pragmaTree) {
        expect(summonTree.get(path)?.equals(content), path).toBe(true);
      }
      expect(pragmaTree.size).toBeGreaterThan(0);
    });
  }
});
