/**
 * PROTECTED — the exhaustive 32-cell truth table of the ONE interaction
 * decision. Every combination of the five inputs is enumerated literally, so
 * the decision function cannot change a single cell without this file naming
 * it. The table here is the normative §B of the parity contract.
 */

import { describe, expect, it } from "vitest";
import {
  decideInteraction,
  type InteractionMode,
  missingExplicitFlags,
  refusalMessage,
} from "./decideInteraction.js";
import type { PromptLike } from "./types.js";

/** Expected mode per (dryRun, undo, yes, isTTY, explicitComplete). */
function expected(
  dryRun: boolean,
  undo: boolean,
  yes: boolean,
  isTTY: boolean,
  explicitComplete: boolean,
): InteractionMode {
  // Row 1: dry-run wins over everything (batch, TTY-independent).
  if (dryRun) return "batch-dry-run";
  // Row 2: undo next (batch, TTY-independent).
  if (undo) return "batch-undo";
  // Row 3: --yes is a scripted run with defaults.
  if (yes) return "run";
  // Row 4: a TTY gets the wizard (asks pendingPrompts; may be empty).
  if (isTTY) return "wizard";
  // Row 5: fully-explicit non-TTY input is a legitimate scripted run.
  if (explicitComplete) return "run";
  // Row 6: non-TTY, incomplete, no batch flag — refuse.
  return "refuse";
}

describe("decideInteraction — all 32 cells (PROTECTED)", () => {
  const bools = [false, true] as const;
  for (const dryRun of bools) {
    for (const undo of bools) {
      for (const yes of bools) {
        for (const isTTY of bools) {
          for (const explicitComplete of bools) {
            const label = JSON.stringify({
              dryRun,
              undo,
              yes,
              isTTY,
              explicitComplete,
            });
            it(`${label} -> ${expected(dryRun, undo, yes, isTTY, explicitComplete)}`, () => {
              const decision = decideInteraction({
                dryRun,
                undo,
                yes,
                isTTY,
                explicitComplete,
              });
              expect(decision.mode).toBe(
                expected(dryRun, undo, yes, isTTY, explicitComplete),
              );
              // The refusal marker exists exactly on the refuse cell.
              expect(decision.refusal).toBe(
                decision.mode === "refuse" ? true : undefined,
              );
            });
          }
        }
      }
    }
  }
});

describe("missingExplicitFlags", () => {
  const prompts: PromptLike[] = [
    { name: "componentPath", type: "text", message: "Path:" },
    { name: "withStyles", type: "confirm", message: "Styles?", default: true },
    {
      name: "useTsStories",
      type: "confirm",
      message: "TS?",
      default: false,
      conditional: true,
    },
    {
      name: "liveConditional",
      type: "text",
      message: "Live:",
      when: () => true,
    },
  ];

  it("lists unconditional prompts absent from the explicit answers, kebab-cased, declared order", () => {
    expect(missingExplicitFlags(prompts, {})).toEqual([
      "component-path",
      "with-styles",
    ]);
    expect(missingExplicitFlags(prompts, { componentPath: "x" })).toEqual([
      "with-styles",
    ]);
  });

  it("skips conditional prompts in both live and projected form", () => {
    expect(missingExplicitFlags(prompts, {})).not.toContain("use-ts-stories");
    expect(missingExplicitFlags(prompts, {})).not.toContain("live-conditional");
  });
});

describe("refusalMessage", () => {
  it("carries the recovery and the missing flag list", () => {
    expect(refusalMessage(["component-path", "description"])).toBe(
      "Refusing to scaffold in a non-interactive run without complete input. " +
        "Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag. " +
        "Missing: --component-path, --description.",
    );
  });

  it("omits the Missing list when nothing is missing", () => {
    expect(refusalMessage([])).toBe(
      "Refusing to scaffold in a non-interactive run without complete input. " +
        "Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag.",
    );
  });
});
