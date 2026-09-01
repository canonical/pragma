/**
 * THE definition of the seam a conforming binary must match.
 *
 * A binary conforms iff, for a given generator and answer set, the tree it
 * writes byte-equals the tree produced HERE: summon-core's `execute` with
 * `autoPrompt`, run through `runGeneratorTask` with the shared stamp
 * (`createStampOnEffectStart(createGeneratorStamp(generator))`). Every other
 * path — the summon bin's Ink front-end, the pragma kernel's `create` verbs —
 * is a UI over exactly this, so the reference is not "one more implementation
 * to keep in sync"; it is the implementation, called without a front-end.
 *
 * Writing that definition down once is the point. Before this module, the
 * guarantee lived only inside one bin's test file, so the OTHER bin could drift
 * and nothing would notice.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import execute from "../../execute/execute.js";
import autoPrompt from "../../prompt/autoPrompt.js";
import runGeneratorTask from "../../run/runGeneratorTask.js";
import createGeneratorStamp from "../../stamp/createGeneratorStamp.js";
import createStampOnEffectStart from "../../stamp/createStampOnEffectStart.js";
import type GeneratorDefinition from "../../types/GeneratorDefinition.js";
import { snapshotTree, type TreeSnapshot } from "./snapshotTree.js";

/** One reference run: a generator, the answers to feed it, and where to write. */
export interface ReferenceRun {
  /** The generator definition under test — supplied by the CALLER's package. */
  // biome-ignore lint/suspicious/noExplicitAny: a generator of any answer shape.
  readonly generator: GeneratorDefinition<any>;
  /** The complete answer set; every prompt must be answered (no interaction). */
  readonly answers: Readonly<Record<string, unknown>>;
  /** Where to generate. Defaults to a fresh temp directory. */
  readonly cwd?: string;
}

/** Create the throwaway directory a reference run writes into by default. */
function freshCwd(): string {
  return mkdtempSync(join(tmpdir(), "summon-conformance-"));
}

/**
 * Produce the reference tree for one generator + answer set.
 *
 * @param run - The generator, its answers, and an optional target directory.
 * @returns The generated tree, snapshotted.
 * @note Impure — writes files and reads them back.
 */
export async function produceReference(
  run: ReferenceRun,
): Promise<TreeSnapshot> {
  const cwd = run.cwd ?? freshCwd();
  const answers = { ...run.answers };
  await runGeneratorTask(
    execute(run.generator, { prompt: autoPrompt(answers), params: answers }),
    {
      cwd,
      promptHandler: autoPrompt(answers),
      onEffectStart: createStampOnEffectStart(
        createGeneratorStamp(run.generator),
      ),
      onLog: () => {},
    },
  );
  return snapshotTree(cwd);
}
