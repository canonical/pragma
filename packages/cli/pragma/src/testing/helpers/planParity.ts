/**
 * The dry-vs-real harness: run ONE capability both ways and compare what its
 * READS decided.
 *
 * This exists because `--dry-run` was advertised as plan-first on twelve
 * mutating verbs and nothing pinned READ FIDELITY — that a plan's reads observe
 * what its run's reads observe. Plenty pinned the surrounding behaviour (exit
 * 0, plan contains X, nothing written, CLI/MCP plan parity), and all of it
 * stayed green while the plan interpreter answered `ReadFile` with
 * `[mock content of <path>]` and `Exists` from an empty virtual set.
 *
 * The comparison is deliberately at the EFFECT level rather than the rendered
 * plan text: `describeEffect` collapses a write to a path and a byte count, so
 * a plan that wrote the wrong bytes at the right length would compare equal.
 *
 * Both sides are driven through the same construction the dispatcher performs
 * (`kernel/project/cli/dispatch.ts#executeVerb`): the verb's `run` receives a
 * mutation runtime and sets `rt.exec` as its last act, and each side then CALLS
 * the shipped seam — `planEffectSeam` on the plan side, `runEffectSeam` on the
 * real one. Mirroring the dispatcher rather than calling `executeVerb` is what
 * makes the effect lists observable at all — the dispatcher renders them to
 * strings and drops the objects — and mirroring it FAITHFULLY is what makes them
 * worth comparing.
 *
 * ## What mirroring cannot do, and what covers it instead
 *
 * A harness that mirrors a call site cannot prove the call site is still wired.
 * While this file spelled `{ cwd: rt.exec?.cwd, onEffectStart: rt.exec?.shapeEffect }`
 * inline, deleting exactly that from BOTH shipped plan branches (the CLI
 * dispatcher and the MCP projector) left the whole package green — 1121 passed,
 * 0 failed — while `create component --dry-run` planned every generated file
 * short by exactly its generated-by stamp (58 bytes for the line-comment form,
 * 61 for `styles.css`'s CSS block-comment form). The two changes that close it: both
 * branches and this file now call the ONE `planEffectSeam`, and
 * `dryRunParity.test.ts`'s last case drives `--dry-run` through the shipped
 * dispatcher and compares its reported byte counts against the paired real run's
 * files on disk. MCP is then held by `create.mcp.test.ts`, which pins its plan
 * to the CLI's — anchored now that the CLI side has an absolute claim.
 */

import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import type { LeafEffect } from "@canonical/task/node";
import { planTask, runTask } from "@canonical/task/node";
import { expect } from "vitest";
import {
  planEffectSeam,
  runEffectSeam,
} from "../../kernel/runtime/effectSeam.js";
import type {
  InteractionRuntime,
  PragmaRuntime,
} from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";

/** One interpretation of a verb's Task: the effects it reached and its value. */
export interface Interpretation {
  readonly effects: readonly LeafEffect[];
  readonly value: unknown;
}

/** The two interpretations of the same capability against the same state. */
export interface PlanVsRun {
  readonly plan: Interpretation;
  readonly run: Interpretation;
}

/** Build the mutation runtime the dispatcher builds, for one branch. */
function mutationRuntime(
  runtime: PragmaRuntime,
  preview: boolean,
): PragmaRuntime {
  const interaction: InteractionRuntime = {
    isTTY: false,
    transport: "cli",
    yes: !preview,
  };
  return { ...runtime, mutation: { preview }, interaction };
}

/**
 * Interpret a verb's Task as a PLAN, exactly as the `--dry-run` branch does.
 *
 * @param verb - The mutating verb.
 * @param params - The coerced param bag.
 * @param runtime - A booted runtime.
 * @returns The effects the plan reached and the value it produced.
 * @note Impure — performs the capability's real reads.
 */
export async function interpretAsPlan(
  verb: VerbSpec,
  params: Record<string, unknown>,
  runtime: PragmaRuntime,
): Promise<Interpretation> {
  const rt = mutationRuntime(runtime, true);
  if (verb.capability.needsStore) await rt.store.get();
  const task = await Promise.resolve(verb.run(params, rt));
  const planned = await planTask(task as never, planEffectSeam(rt.exec));
  return { effects: planned.effects, value: planned.value };
}

/**
 * Interpret a verb's Task for REAL, recording every effect through the node
 * interpreter's `onEffectStart` seam.
 *
 * @param verb - The mutating verb.
 * @param params - The coerced param bag.
 * @param runtime - A booted runtime.
 * @returns The effects the run performed and the value it produced.
 * @note Impure — performs the capability's real mutation.
 */
export async function interpretForReal(
  verb: VerbSpec,
  params: Record<string, unknown>,
  runtime: PragmaRuntime,
): Promise<Interpretation> {
  const rt = mutationRuntime(runtime, false);
  if (verb.capability.needsStore) await rt.store.get();
  const task = await Promise.resolve(verb.run(params, rt));
  const effects: LeafEffect[] = [];
  const exec = rt.exec ?? {};
  // COMPOSE with the verb's own seam, never override it. Overriding stripped
  // the real side of exactly the transform the dispatcher applies — `create`'s
  // stamp mutates `WriteFile.content` in place on this seam — so both sides
  // recorded un-stamped bytes and agreed, while the shipped `--dry-run` was
  // short by 50 bytes a file. The recorder runs LAST so what it pushes is what
  // the interpreter is about to perform.
  const seam = runEffectSeam(exec);
  const value = await runTask(task as never, {
    // Swallow log output: the dispatcher routes it to stderr, which is noise
    // here. A verb that sets its own `onLog` still wins (spread order).
    onLog: () => {},
    ...exec,
    onEffectStart: (effect) => {
      seam?.(effect);
      // `planTask` collects LEAF effects only; `runTask` announces `Parallel`
      // and `Race` through this same callback, so recording them would make the
      // two lists differ in LENGTH for any capability that uses them — a
      // spurious failure whose cheapest reading is "the harness is too strict".
      if (effect._tag !== "Parallel" && effect._tag !== "Race") {
        effects.push(effect);
      }
    },
  });
  await exec.dispose?.();
  return { effects, value };
}

/** A stable snapshot of a tree: every path, and every file's exact bytes. */
export function snapshotTree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string, prefix: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = join(at, entry.name);
      if (entry.isSymbolicLink()) {
        out[rel] = `<symlink ${readlinkSync(full)}>`;
      } else if (entry.isDirectory()) {
        out[`${rel}/`] = "";
        walk(full, rel);
      } else {
        out[rel] = readFileSync(full, "utf-8");
      }
    }
  };
  walk(root, "");
  return out;
}

/** The comparable shape of one effect: everything a read could have decided. */
function observable(effect: LeafEffect): Record<string, unknown> {
  switch (effect._tag) {
    case "WriteFile":
      // The CONTENT, not its length: a plan that merged the wrong document
      // could still write the right number of bytes.
      return { tag: effect._tag, path: effect.path, content: effect.content };
    case "AppendFile":
      return { tag: effect._tag, path: effect.path, content: effect.content };
    case "CopyFile":
    case "CopyDirectory":
      return { tag: effect._tag, source: effect.source, dest: effect.dest };
    case "Log":
      return { tag: effect._tag, level: effect.level, message: effect.message };
    case "Exec":
      return { tag: effect._tag, command: effect.command, args: effect.args };
    case "Glob":
      return { tag: effect._tag, pattern: effect.pattern, cwd: effect.cwd };
    case "ReadContext":
    case "WriteContext":
      return { tag: effect._tag, key: effect.key };
    case "Prompt":
      return { tag: effect._tag };
    default:
      return { tag: effect._tag, path: effect.path };
  }
}

/**
 * Assert that a plan and its run agree on everything a read decides: the same
 * effect tags in the same order, on the same paths, with the same bytes.
 *
 * @param both - The two interpretations from {@link interpretAsPlan} and
 * {@link interpretForReal}.
 * @param scrub - Optional normaliser applied to every string before comparing,
 * for the one legitimate difference between two runs of the same capability:
 * wall-clock content (e.g. the corrupt-config backup's ISO timestamp, which
 * `corruptBackupPath` mints from `new Date()` at effect-construction time).
 */
export function expectReadParity(
  both: PlanVsRun,
  scrub: (value: string) => string = (value) => value,
): void {
  const shape = (effects: readonly LeafEffect[]): unknown[] =>
    effects.map((effect) =>
      Object.fromEntries(
        Object.entries(observable(effect)).map(([key, value]) => [
          key,
          typeof value === "string" ? scrub(value) : value,
        ]),
      ),
    );
  expect(shape(both.plan.effects)).toEqual(shape(both.run.effects));
}
