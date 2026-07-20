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
 * The `--scope` selection is threaded through detection AND step-offering so
 * `listAvailableSteps` only offers steps whose band the scope runs, and the MCP
 * step targets exactly the deduped files for that scope. Per-file narrowing is
 * opt-in (Item 6): the "all" default never springs a per-file question — it
 * configures every deduped file.
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
import type { ScopeSelection, SetupMode, SetupResult } from "../types.js";
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
  mcpTargets,
  selectedGroups,
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
const readSteps = (answers: Record<string, unknown>): string[] =>
  Array.isArray(answers.steps) ? (answers.steps as string[]) : [];

/** Read `answers.mcpTargets` (selected file paths), falling back to ALL files. */
const resolveMcpPaths = (
  d: McpDetection,
  answers: Record<string, unknown>,
): string[] =>
  Array.isArray(answers.mcpTargets)
    ? (answers.mcpTargets as string[])
    : d.groups.map((g) => g.path);

/** The groups the user chose (or all, under the "all" default). */
const selectChosenGroups = (
  d: McpDetection,
  answers: Record<string, unknown>,
) => selectedGroups(d, resolveMcpPaths(d, answers));

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
const buildMeta = (
  rt: PragmaRuntime,
  title: string,
): GeneratorDefinition["meta"] => ({
  name: title,
  displayName: title,
  description: "Configure pragma for this project",
  version: rt.version,
});

/** The opt-in "customize which files" gate (Item 6) — defaults to false. */
const buildCustomizePrompt = (
  when?: PromptDefinition["when"],
): PromptDefinition => ({
  name: "customize",
  type: "confirm",
  message: "Customize which files pragma configures?",
  default: false,
  when,
});

/** The per-file MCP multiselect — one row per deduped {@link TargetGroup} file. */
const buildMcpTargetsPrompt = (
  d: McpDetection,
  when?: PromptDefinition["when"],
): PromptDefinition => ({
  name: "mcpTargets",
  type: "multiselect",
  message: "Configure MCP for which files?",
  when,
  choices: d.groups.map((g) => ({
    label: `${g.path} — ${g.harnessNames.join(", ")} [${g.scope}]`,
    value: g.path,
  })),
  default: d.groups.map((g) => g.path),
});

// =============================================================================
// Detection
// =============================================================================

/** Gather EVERY step's detection up front (real reads), for the run-all. */
async function gatherDetection(
  rt: PragmaRuntime,
  scope: ScopeSelection,
): Promise<SetupDetection> {
  const [completions, mcp, skills] = await Promise.all([
    detectCompletions(rt.cwd),
    detectMcp(rt, scope),
    detectSkills(rt),
  ]);
  return { completions, mcp, skills };
}

/**
 * The steps worth OFFERING, given detection AND the scope selection. An
 * undetectable step is omitted so the run-all degrades gracefully instead of
 * throwing a mid-wizard EMPTY_RESULTS; a step whose band the scope does not run
 * is omitted too (completions/lsp are global-band, skills are project-band, MCP
 * spans both via its resolved groups). Threading `scope` here is what makes
 * `setup --local` skip completions+lsp and `setup --global` skip skills — the
 * MCP groups are already scoped by {@link detectMcp}.
 *
 * @param detected - Every step's up-front detection.
 * @param scope - The resolved `--scope` selection (project/global/both).
 * @returns The offerable steps, in composition/display order.
 */
function listAvailableSteps(
  detected: SetupDetection,
  scope: ScopeSelection,
): { label: string; value: StepId }[] {
  const hasProject = scope !== "global";
  const hasGlobal = scope !== "project";
  const choices: { label: string; value: StepId }[] = [];
  if (detected.completions.shell && hasGlobal) {
    choices.push({
      label: `Shell completions (${detected.completions.shell})`,
      value: "completions",
    });
  }
  if (hasGlobal) {
    choices.push({ label: "Terrazzo LSP extension", value: "lsp" });
  }
  if (detected.mcp.groups.length > 0) {
    choices.push({
      label: `MCP config (${detected.mcp.groups.length} file(s))`,
      value: "mcp",
    });
  }
  if (detected.skills.available && hasProject) {
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

/**
 * The run-all self-verb: a step multiselect + per-step composition. The resolved
 * `scope` narrows BOTH the offered steps (via {@link listAvailableSteps}) and the
 * MCP target groups (already scoped by {@link detectMcp}), so `--local` omits the
 * global-band completions+lsp and `--global` omits the project-band skills.
 */
function buildRunAllPlan(
  rt: PragmaRuntime,
  detected: SetupDetection,
  scope: ScopeSelection,
): SetupPlan {
  const steps = listAvailableSteps(detected, scope);
  const prompts: PromptDefinition[] = [
    {
      name: "steps",
      type: "multiselect",
      message: "Which steps would you like to run?",
      choices: steps,
      default: steps.map((c) => c.value), // --yes / non-TTY ⇒ every step
    },
  ];
  // Item 6: per-file narrowing is opt-in. The "customize?" gate (default false)
  // only surfaces when MCP is chosen and there is more than one file; the
  // per-file multiselect only surfaces after an explicit yes — so the "all"
  // default configures every deduped file without an extra question.
  if (detected.mcp.groups.length > 0) {
    prompts.push(
      buildCustomizePrompt((a) => readSteps(a).includes("mcp")),
      buildMcpTargetsPrompt(
        detected.mcp,
        (a) => a.customize === true && readSteps(a).includes("mcp"),
      ),
    );
  }

  // `generate` MUST be pure and re-runnable — `execute` interprets it twice (the
  // confirm-gate preview + the build) — so it composes with `when`/`sequence_`
  // (immutable) rather than a single-use `gen`, and does NO detection (all real
  // reads already happened up front). Composing an unchosen step is harmless:
  // `when(false, …)` discards the (side-effect-free) task it was handed.
  const generator: GeneratorDefinition = {
    meta: buildMeta(rt, "pragma setup"),
    prompts,
    generate: (answers) => {
      const chosen = readSteps(answers);
      return sequence_([
        when(
          chosen.includes("completions"),
          composeCompletions(detected.completions),
        ),
        when(chosen.includes("lsp"), composeGuardedLsp(rt)),
        when(
          chosen.includes("mcp"),
          composeMcp(detected.mcp, selectChosenGroups(detected.mcp, answers)),
        ),
        when(chosen.includes("skills"), composeSkills(detected.skills)),
      ]);
    },
  };

  return {
    generator,
    toResult: (answers) => ({ kind: "all", steps: readSteps(answers) }),
  };
}

/** A single-step generator (no run-all multiselect) for one sub-verb. */
function buildSingleStep(
  rt: PragmaRuntime,
  title: string,
  prompts: PromptDefinition[],
  generate: (answers: Record<string, unknown>) => Task<void>,
): GeneratorDefinition {
  return { meta: buildMeta(rt, title), prompts, generate };
}

/**
 * Build the plan for an entry point. Detection runs here (up front); the
 * returned generator's `generate` is pure. The `skills` sub-verb throws
 * EMPTY_RESULTS before returning a plan when nothing is discoverable (its direct
 * contract), whereas the run-all simply omits an undetectable step.
 *
 * @param rt - The per-invocation runtime.
 * @param mode - The entry point (`all` or one sub-verb).
 * @param scope - The resolved `--scope` selection (project/global/both).
 * @returns The generator + result mapper.
 * @throws PragmaError EMPTY_RESULTS for a direct `setup skills` with no skills.
 * @note Impure — performs each step's real detection.
 */
export async function buildSetupPlan(
  rt: PragmaRuntime,
  mode: SetupMode,
  scope: ScopeSelection,
): Promise<SetupPlan> {
  switch (mode) {
    case "all":
      return buildRunAllPlan(rt, await gatherDetection(rt, scope), scope);

    case "completions": {
      const d = await detectCompletions(rt.cwd);
      return {
        generator: buildSingleStep(rt, "pragma setup completions", [], () =>
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
        generator: buildSingleStep(rt, "pragma setup lsp", [], () =>
          composeGuardedLsp(rt),
        ),
        toResult: () => ({ kind: "lsp" }),
      };

    case "mcp": {
      const d = await detectMcp(rt, scope);
      const prompts: PromptDefinition[] =
        d.groups.length > 0
          ? [
              buildCustomizePrompt(),
              buildMcpTargetsPrompt(d, (a) => a.customize === true),
            ]
          : [];
      return {
        generator: buildSingleStep(rt, "pragma setup mcp", prompts, (answers) =>
          composeMcp(d, selectChosenGroups(d, answers)),
        ),
        toResult: (answers) => {
          const sel = selectChosenGroups(d, answers);
          return {
            kind: "mcp",
            configured: mcpConfigured(sel),
            targets: mcpTargets(sel),
          };
        },
      };
    }

    case "skills": {
      const d = await detectSkills(rt);
      if (!d.available) throw skillsEmptyError();
      return {
        generator: buildSingleStep(rt, "pragma setup skills", [], () =>
          composeSkills(d),
        ),
        toResult: () => ({ kind: "skills", result: toSkillsResult(d) }),
      };
    }
  }
}
