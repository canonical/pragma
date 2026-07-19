/**
 * Synthesize `setup` (and each sub-verb) as a summon `GeneratorDefinition`, so
 * they all flow through the SAME `execute` seam `create` uses — inheriting the
 * Ink wizard, the recap/confirm gate, live progress, colours, and the shared
 * cancel fixes (H1/H2/H3/M1) by construction. Replaces the old readline
 * `promptStrategy` + `setupAll`.
 *
 * The shape mirrors `create`: detection runs FOR REAL up front (in each
 * `detectX`), then a PURE `generate` composes only the effects for the SELECTED
 * steps. `generate` must stay side-effect-free — `execute` and the wizard invoke
 * it more than once (the confirm-gate preview + the build), so all real reads
 * belong in detection, never in `generate`.
 *
 * This module carries NO static import of `@canonical/summon-core` VALUES or of
 * React/Ink — it only `import type`s the generator shape and builds plain object
 * literals over `@canonical/task`. It is itself reached only through the verb's
 * lazy dynamic import, so the fast paths stay free of it.
 */

import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import { sequence_, type Task, when } from "@canonical/task";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { guardMissingBinary } from "../../shared/assertExecOk.js";
import type { SetupMode, SetupResult } from "../types.js";
import {
  type CompletionsDetection,
  composeCompletions,
  detectCompletions,
} from "./setupCompletions.js";
import { composeLsp } from "./setupLsp.js";
import {
  composeMcp,
  detectMcp,
  type McpDetection,
  mcpConfigured,
} from "./setupMcp.js";
import {
  composeSkills,
  detectSkills,
  type SkillsDetection,
  skillsEmptyError,
  toSkillsResult,
} from "./setupSkills.js";

/** The run-all steps, in composition (and display) order. */
type StepId = "completions" | "lsp" | "mcp" | "skills";

/**
 * A ready-to-run setup plan: the synthesized generator (fed to `inkPrompt` /
 * `execute`) plus a mapper from the completed answers back onto setup's tagged
 * {@link SetupResult} output union (its `--format json` shape is frozen).
 */
export interface SetupPlan {
  readonly generator: GeneratorDefinition;
  readonly toResult: (answers: Record<string, unknown>) => SetupResult;
}

/** The union of every step's detection, gathered up front for the run-all. */
interface SetupDetection {
  readonly completions: CompletionsDetection;
  readonly mcp: McpDetection;
  readonly skills: SkillsDetection;
}

/** Read `answers.steps` (the run-all multiselect) as a string array. */
const stepsOf = (answers: Record<string, unknown>): string[] =>
  Array.isArray(answers.steps) ? (answers.steps as string[]) : [];

/** Read `answers.mcpHarnesses`, falling back to ALL detected ids. */
const mcpSelection = (
  d: McpDetection,
  answers: Record<string, unknown>,
): string[] =>
  Array.isArray(answers.mcpHarnesses)
    ? (answers.mcpHarnesses as string[])
    : d.harnesses.map((h) => h.harness.id);

/**
 * The LSP-install step, guarded at its use site. An absent `bunx` (no Bun on
 * PATH) REJECTS the exec with ENOENT, which would otherwise collapse to
 * INTERNAL_ERROR ("please report this issue") at the CLI/MCP boundary;
 * `guardMissingBinary` names it a UNSUPPORTED "`bunx` not found on PATH" with an
 * actionable install recovery instead. Preview-transparent — a dry-run mocks the
 * exec (no spawn) — and re-runnable (the guard is a `recover`, and `composeLsp`
 * is combinator-built), so it survives `execute`'s double interpretation.
 */
const composeGuardedLsp = (rt: PragmaRuntime): Task<void> =>
  guardMissingBinary(
    "bunx",
    {
      message:
        "Install Bun (https://bun.sh) to provide `bunx`, then run this again.",
    },
    composeLsp(rt.cwd),
  );

/** Build a generator's `meta` (no stamping — the version is just header text). */
const metaFor = (
  rt: PragmaRuntime,
  title: string,
): GeneratorDefinition["meta"] => ({
  name: title,
  displayName: title,
  description: "Configure pragma for this project",
  version: rt.version,
});

/** The MCP-harness multiselect follow-up (offered only when harnesses exist). */
const mcpHarnessesPrompt = (
  d: McpDetection,
  when?: PromptDefinition["when"],
): PromptDefinition => ({
  name: "mcpHarnesses",
  type: "multiselect",
  message: "Configure MCP for which harnesses?",
  when,
  choices: d.harnesses.map((h) => ({
    label: h.harness.name,
    value: h.harness.id,
  })),
  default: d.harnesses.map((h) => h.harness.id),
});

// =============================================================================
// Detection
// =============================================================================

/** Gather EVERY step's detection up front (real reads), for the run-all. */
async function gatherDetection(rt: PragmaRuntime): Promise<SetupDetection> {
  const [completions, mcp, skills] = await Promise.all([
    detectCompletions(rt.cwd),
    detectMcp(rt),
    detectSkills(rt),
  ]);
  return { completions, mcp, skills };
}

/**
 * The steps worth OFFERING, given detection — undetectable steps are omitted so
 * the run-all degrades gracefully instead of throwing a mid-wizard
 * EMPTY_RESULTS (skills with no skills, mcp with no harnesses, completions with
 * no shell). LSP is always offered (its install is a self-contained exec).
 */
function availableSteps(
  detected: SetupDetection,
): { label: string; value: StepId }[] {
  const choices: { label: string; value: StepId }[] = [];
  if (detected.completions.shell) {
    choices.push({
      label: `Shell completions (${detected.completions.shell})`,
      value: "completions",
    });
  }
  choices.push({ label: "Terrazzo LSP extension", value: "lsp" });
  if (detected.mcp.harnesses.length > 0) {
    choices.push({
      label: `MCP config (${detected.mcp.harnesses.length} harness(es))`,
      value: "mcp",
    });
  }
  if (detected.skills.available) {
    choices.push({
      label: `Link skills (${detected.skills.skillCount})`,
      value: "skills",
    });
  }
  return choices;
}

// =============================================================================
// Plan builders
// =============================================================================

/** The run-all self-verb: a step multiselect + per-step composition. */
function runAllPlan(rt: PragmaRuntime, detected: SetupDetection): SetupPlan {
  const steps = availableSteps(detected);
  const prompts: PromptDefinition[] = [
    {
      name: "steps",
      type: "multiselect",
      message: "Which steps would you like to run?",
      choices: steps,
      default: steps.map((c) => c.value), // --yes / non-TTY ⇒ every step
    },
  ];
  if (detected.mcp.harnesses.length > 0) {
    prompts.push(
      mcpHarnessesPrompt(
        detected.mcp,
        (a) => stepsOf(a).includes("mcp"), // only when mcp is chosen
      ),
    );
  }

  // `generate` MUST be pure and re-runnable — `execute` interprets it twice (the
  // confirm-gate preview + the build) — so it composes with `when`/`sequence_`
  // (immutable) rather than a single-use `gen`, and does NO detection (all real
  // reads already happened up front). Composing an unchosen step is harmless:
  // `when(false, …)` discards the (side-effect-free) task it was handed.
  const generator: GeneratorDefinition = {
    meta: metaFor(rt, "pragma setup"),
    prompts,
    generate: (answers) => {
      const chosen = stepsOf(answers);
      return sequence_([
        when(
          chosen.includes("completions"),
          composeCompletions(detected.completions),
        ),
        when(chosen.includes("lsp"), composeGuardedLsp(rt)),
        when(
          chosen.includes("mcp"),
          composeMcp(detected.mcp, mcpSelection(detected.mcp, answers)),
        ),
        when(chosen.includes("skills"), composeSkills(detected.skills)),
      ]);
    },
  };

  return {
    generator,
    toResult: (answers) => ({ kind: "all", steps: stepsOf(answers) }),
  };
}

/** A single-step generator (no run-all multiselect) for one sub-verb. */
function singleStep(
  rt: PragmaRuntime,
  title: string,
  prompts: PromptDefinition[],
  generate: (answers: Record<string, unknown>) => Task<void>,
): GeneratorDefinition {
  return { meta: metaFor(rt, title), prompts, generate };
}

/**
 * Build the plan for an entry point. Detection runs here (up front); the
 * returned generator's `generate` is pure. The `skills` sub-verb throws
 * EMPTY_RESULTS before returning a plan when nothing is discoverable (its direct
 * contract), whereas the run-all simply omits an undetectable step.
 *
 * @param rt - The per-invocation runtime.
 * @param mode - The entry point (`all` or one sub-verb).
 * @returns The generator + result mapper.
 * @throws PragmaError EMPTY_RESULTS for a direct `setup skills` with no skills.
 * @note Impure — performs each step's real detection.
 */
export async function buildSetupPlan(
  rt: PragmaRuntime,
  mode: SetupMode,
): Promise<SetupPlan> {
  switch (mode) {
    case "all":
      return runAllPlan(rt, await gatherDetection(rt));

    case "completions": {
      const d = await detectCompletions(rt.cwd);
      return {
        generator: singleStep(rt, "pragma setup completions", [], () =>
          composeCompletions(d),
        ),
        toResult: () => ({
          kind: "completions",
          shell: d.shell,
          path: d.path,
          installed: d.shell !== null,
        }),
      };
    }

    case "lsp":
      return {
        generator: singleStep(rt, "pragma setup lsp", [], () =>
          composeGuardedLsp(rt),
        ),
        toResult: () => ({ kind: "lsp" }),
      };

    case "mcp": {
      const d = await detectMcp(rt);
      const prompts = d.harnesses.length > 0 ? [mcpHarnessesPrompt(d)] : [];
      return {
        generator: singleStep(rt, "pragma setup mcp", prompts, (answers) =>
          composeMcp(d, mcpSelection(d, answers)),
        ),
        toResult: (answers) => ({
          kind: "mcp",
          configured: mcpConfigured(d, mcpSelection(d, answers)),
        }),
      };
    }

    case "skills": {
      const d = await detectSkills(rt);
      if (!d.available) throw skillsEmptyError();
      return {
        generator: singleStep(rt, "pragma setup skills", [], () =>
          composeSkills(d),
        ),
        toResult: () => ({ kind: "skills", result: toSkillsResult(d) }),
      };
    }
  }
}
