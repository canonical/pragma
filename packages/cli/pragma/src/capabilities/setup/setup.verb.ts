/**
 * The `setup` verbs — the run-all self-verb plus the five CLI-only sub-verbs
 * (`config`/`completions`/`lsp`/`mcp`/`skills`), every one of them derived from
 * the target table.
 *
 * `setup` is the ONE covenant noun that is BOTH directly runnable and has
 * sub-verbs. All of them are storeless, interactive mutations. The sub-verbs are
 * `mcp: false` (`buildServer` skips them, `buildProgram` still registers them);
 * only the self-verb is an MCP tool. `destructive: false` keeps MCP from
 * advertising the tool as destructive.
 *
 * THE BAND DEFAULT IS GLOBAL. `--scope` used to default to `both`, and `both`
 * runs each harness's own default band — which is `project` for most of the
 * registry — so a bare `setup` scattered `.mcp.json`, `.gemini/settings.json`
 * and `opencode.json` into whatever directory you happened to be standing in.
 * The user band is what a machine-level installer configures; the project band
 * is a deliberate, checked-in, team-shared choice, and is now chosen with
 * `--local` rather than assumed.
 *
 * Every sub-verb registers the scope flags UNIFORMLY. That is what lets the band
 * answer come from the table instead of per-verb flag wiring — previously
 * `setup completions --local` died as an unknown option, while `setup mcp
 * --local` worked, for no reason a user could see. Asking a target for a band it
 * cannot honour is a usage error (exit 2) with the corrected command; asking the
 * RUN-ALL for such a band merely filters, and the out-of-band target still shows
 * as a named row.
 *
 * summon-core + the generator ops stay behind a LAZY dynamic import (mirroring
 * `create`'s `loadCreateRuntime`), so building the command tree / `--help` /
 * `__complete` — and `setup --yes` — load no React/Ink.
 */

import type { GeneratorResult } from "@canonical/summon-core";
import { $, gen, pure, type Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type {
  CapabilityModule,
  ParamSpec,
  VerbSpec,
} from "../../kernel/spec/types.js";
import { resolveSetupMode, setupModeInput } from "./mode.js";
import {
  planExitFailed,
  planTally,
  type SetupPlan,
  TARGET_IDS,
} from "./plan.js";
import { renderProgressLine, renderRecap } from "./plan.render.js";
import { renderDryRun, setupFormatters } from "./setup.render.js";
import type { ScopeBand, ScopeSelection, SetupMode } from "./types.js";

/**
 * The `--scope` flag + its `--global`/`--local` boolean sugars. Registered by
 * EVERY setup verb, including the single-band ones: a flag that exists on some
 * sub-verbs and not others is a grammar the user has to memorise, and the band
 * a single-band target can honour is a question the target table answers.
 *
 * `--global` is a synonym of the default; it stays for scripts and for symmetry
 * with `--local`.
 */
const SCOPE_PARAMS: readonly ParamSpec[] = [
  {
    kind: "enum",
    name: "scope",
    doc: "Which config band(s) to configure: global (the default), project, or both.",
    values: ["project", "global", "both"],
    default: "global",
  },
  {
    kind: "boolean",
    name: "global",
    doc: "Shorthand for --scope global (configure the user/home band).",
  },
  {
    kind: "boolean",
    name: "local",
    doc: "Shorthand for --scope project (configure the per-project band).",
  },
];

/**
 * Resolve the `--scope`/`--global`/`--local` params into a single selection.
 * The boolean sugars win over `--scope`; `--global` wins over `--local`.
 *
 * @param params - The coerced param bag.
 * @returns The resolved scope selection (defaults to `global`).
 */
function resolveScope(params: Record<string, unknown>): ScopeSelection {
  if (params.global === true) return "global";
  if (params.local === true) return "project";
  const scope = params.scope;
  return scope === "project" || scope === "both" ? scope : "global";
}

/**
 * Reject a sub-verb asked for a band its target cannot hold.
 *
 * This is a usage error, not a skip: the user typed a contradiction, and
 * correcting it is exactly what exit 2 means. The message names the band the
 * target DOES have and prints the command that works, so the correction is one
 * paste rather than one manual page.
 *
 * @param mode - The sub-verb's target, or `all`.
 * @param scope - The resolved selection.
 * @throws PragmaError INVALID_INPUT when the target has no such band.
 */
async function assertBandIsPossible(
  mode: SetupMode,
  scope: ScopeSelection,
): Promise<void> {
  if (mode === "all" || scope === "both") return;
  const { findTarget } = await import("./targets.js");
  const target = findTarget(mode);
  if (target === undefined || target.bands.includes(scope as ScopeBand)) return;
  const only = target.bands[0] as ScopeBand;
  const level = only === "global" ? "user-level" : "project-level";
  const corrected =
    only === "global"
      ? `${BIN_NAME} setup ${mode}`
      : `${BIN_NAME} setup ${mode} --local`;
  throw new PragmaError({
    code: "INVALID_INPUT",
    message: `${mode} is ${level} — it has no ${scope} band.`,
    recovery: { message: `Run: ${corrected}` },
  });
}

/** The exposed-to-MCP capability the run-all self-verb declares. */
const SELF_CAPABILITY = {
  needsStore: false,
  mutates: true,
  interactive: true,
  destructive: false,
  mcp: {
    expose: true as const,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
};

/** The CLI-only capability every sub-verb declares (not an MCP tool). */
const SUB_CAPABILITY = {
  needsStore: false,
  mutates: true,
  interactive: true,
  destructive: false,
  mcp: {
    expose: false as const,
    reason: "CLI-only environment installer",
  },
};

/**
 * The one summon↔pragma seam per setup invocation: lazily load summon-core + the
 * generator ops, detect and plan, resolve the interaction mode, wire `rt.exec`,
 * and return the plan with its outcomes filled in.
 *
 * NOTE: `rt.exec` carries NO per-call `cwd`. Unlike `create` (whose generator
 * emits RELATIVE paths jailed to `rt.cwd`), setup's targets build ABSOLUTE
 * effect paths themselves; the interpreter leaves absolute paths unchanged, so
 * no per-call write root is threaded. No stamping either — setup writes
 * symlinks, config and scripts, not generated source.
 *
 * @param mode - Which entry point (`all` or one target).
 * @param rt - The per-invocation runtime (mutated: `rt.exec` and `rt.planData`).
 * @param scope - The resolved band selection.
 * @returns The `Task<SetupPlan>` the dispatcher/MCP handler interprets.
 * @note Impure — runs every target's real detection before returning a Task.
 */
async function runSetup(
  mode: SetupMode,
  rt: PragmaRuntime,
  scope: ScopeSelection,
): Promise<Task<SetupPlan>> {
  await assertBandIsPossible(mode, scope);

  // Lazy dynamic imports (lazy-React discipline): summon-core's barrel is
  // React-free, and the non-TTY branch picks autoPrompt/mcpPrompt (never mounts
  // Ink), so `setup --yes` loads no React — the guard test enforces this.
  const [summon, projection, ops] = await Promise.all([
    import("@canonical/summon-core"),
    import("@canonical/summon-core/projection"),
    import("./operations/setupGenerator.js"),
  ]);

  const input = setupModeInput(rt);
  const run = await ops.buildSetupRun(rt, mode, scope, input.undo);
  const interactionMode = resolveSetupMode(input, projection.decideInteraction);

  // The dry-run seam: the kernel's `--dry-run` branch renders THIS instead of
  // the raw effect dump, while its honest preview still runs underneath and
  // still fails exactly when the real run would.
  rt.planData = { ...run.plan, preview: true };

  // Whether this invocation only PREVIEWS. The task below is driven either way
  // — that is what makes the preview honest — so anything it says out loud has
  // to know which of the two it is.
  const previewing = interactionMode === "batch-dry-run";

  // Adaptation (b): a non-interactive run without `--yes` previews rather than
  // mutating. It is the same plan the dry-run prints, plus one hint line, at
  // exit 0 — the invocation completed a real read-only unit of work.
  if (interactionMode === "refuse") {
    return pure<SetupPlan>({ ...run.plan, preview: true });
  }

  const { isTTY, transport, yes, signal, abort } = rt.interaction ?? {
    isTTY: false,
    transport: "cli" as const,
    yes: true,
  };

  // TTY without --yes → the Ink wizard (recap + live progress). Its callbacks
  // ride rt.exec; `onCancel` threads the run's abort in so an in-Ink Ctrl-C
  // during execution actually stops the writes.
  let task: Task<GeneratorResult>;
  const wizard = interactionMode === "wizard";
  if (wizard) {
    const session = summon.inkPrompt(run.generator, {
      signal,
      onCancel: abort,
    });
    rt.exec = {
      promptHandler: session.promptHandler,
      onEffectStart: session.onEffectStart,
      onEffectComplete: session.onEffectComplete,
      onLog: session.onLog,
      dispose: session.dispose,
      signal,
    };
    task = summon.execute(run.generator, {
      prompt: session.promptHandler,
      params: {},
      signal,
    });
  } else {
    // Non-interactive: MCP → params-or-error; CLI/--yes/CI → defaults.
    const prompt =
      transport === "mcp" ? summon.mcpPrompt({}) : summon.autoPrompt({});
    rt.exec = {
      promptHandler: prompt,
      onLog: (_level, message) => process.stderr.write(`${message}\n`),
      signal,
    };
    task = summon.execute(run.generator, { prompt, params: {}, signal });
  }

  return gen(function* () {
    const result = yield* $(task);
    const applied = run.applied(result.answers);

    // Progress: one line per row on stderr for an unattended run (the Ink
    // session already draws them for the wizard). stdout stays the data stream.
    //
    // A dry run reports NOTHING here. Its honest preview drives this very task
    // with writes recorded, so the progress lines ran for real and announced
    // "✓ config — installed" above a plan that had installed nothing.
    if (!previewing && (!wizard || yes)) {
      const width = Math.max(...applied.rows.map((row) => row.target.length));
      for (const row of applied.rows) {
        if (row.outcome === undefined) continue;
        rt.report?.(renderProgressLine(row, width));
      }
    }

    // A failed row exits 1, and the recap is still shown — partial success is
    // first class, so the run reports every row before naming the ones that did
    // not happen. The recap goes to stderr here because the error renderer owns
    // stdout on a failing run.
    if (planExitFailed(applied)) {
      rt.report?.(renderRecap(applied));
      const failed = applied.rows.filter(
        (row) => row.outcome?.status === "failed",
      );

      // ONE failure reports itself. The row already carries the cause it was
      // given ("`bun` is not found on your PATH") and a remedy that runs on
      // this machine; replacing them with a count would throw away the only
      // two sentences that say what is wrong and what to do about it.
      const only = failed.length === 1 ? failed[0] : undefined;
      if (only?.outcome !== undefined) {
        throw new PragmaError({
          code: "UNSUPPORTED",
          message: `${only.target}: ${only.outcome.note ?? "the step did not complete"}`,
          ...(only.outcome.remedy === undefined
            ? {}
            : { recovery: { message: only.outcome.remedy } }),
        });
      }

      // Several failures: name every one with its own cause, then point at the
      // recap above. A bare list of target names would make the reader re-run
      // each one to find out why it failed.
      const named = failed
        .map((row) => `${row.target} (${row.outcome?.note ?? "no cause recorded"})`)
        .join("; ");
      throw new PragmaError({
        code: "UNSUPPORTED",
        message: `${failed.length} of ${planTally(applied).accountable} targets did not complete: ${named}.`,
        recovery: {
          message: `The other targets are configured. Re-run the ones that did not complete: ${failed
            .map((row) => `\`${BIN_NAME} setup ${row.target}\``)
            .join(", ")}.`,
        },
      });
    }
    return applied;
  });
}

/** Build a setup verb bound to its {@link SetupMode}. */
function setupVerb(
  path: VerbSpec<Record<string, unknown>, SetupPlan>["path"],
  summary: string,
  mode: SetupMode,
  capability: typeof SELF_CAPABILITY | typeof SUB_CAPABILITY,
  extras: Partial<VerbSpec<Record<string, unknown>, SetupPlan>> = {},
): VerbSpec<Record<string, unknown>, SetupPlan> {
  return {
    path,
    summary,
    params: SCOPE_PARAMS,
    output: {
      formatters: setupFormatters,
      // The kernel's dry-run branch renders the plan through this seam instead
      // of dumping raw effects. Absent on every other verb, so nothing else
      // changes shape.
      formatPlan: (planData) => renderDryRun(planData as SetupPlan),
    },
    capability,
    ...extras,
    run: (params, rt) =>
      runSetup(mode, rt, resolveScope(params)) as unknown as Task<SetupPlan>,
  };
}

const setupAllVerb = setupVerb(
  ["setup"],
  "Configure the global config, completions, the LSP, MCP, and skills.",
  "all",
  SELF_CAPABILITY,
  {
    doc: "Plans every target in the selected band, then applies the ones you keep. The user/home band is the default; the scope option chooses the per-project band, or both. A run with no attended terminal prints the plan and applies nothing unless the run is confirmed.",
    examples: [
      { cmd: `${BIN_NAME} setup` },
      {
        cmd: `${BIN_NAME} setup --dry-run`,
        note: "print the plan, write nothing",
      },
      {
        cmd: `${BIN_NAME} setup --local`,
        note: "configure the project band instead",
      },
      {
        cmd: `${BIN_NAME} setup mcp`,
        note: "just the MCP server registration",
      },
    ],
  },
);

const configVerb = setupVerb(
  ["setup", "config"],
  "Create the global config file with its defaults.",
  "config",
  SUB_CAPABILITY,
);

const mcpVerb = setupVerb(
  ["setup", "mcp"],
  `Register the ${BIN_NAME} MCP server in detected AI harnesses.`,
  "mcp",
  SUB_CAPABILITY,
);

const completionsVerb = setupVerb(
  ["setup", "completions"],
  "Install the shell-completion script for your shell.",
  "completions",
  SUB_CAPABILITY,
);

const skillsVerb = setupVerb(
  ["setup", "skills"],
  "Symlink discovered skills into each AI harness.",
  "skills",
  SUB_CAPABILITY,
);

const lspVerb = setupVerb(
  ["setup", "lsp"],
  "Ensure the Terrazzo LSP VS Code extension is installed.",
  "lsp",
  SUB_CAPABILITY,
);

/** The `setup` capability module (run-all self-verb + five CLI-only sub-verbs). */
export const setupModule: CapabilityModule = {
  name: "setup",
  verbs: [
    asVerb(setupAllVerb),
    asVerb(configVerb),
    asVerb(completionsVerb),
    asVerb(lspVerb),
    asVerb(mcpVerb),
    asVerb(skillsVerb),
  ],
};

/** Re-exported so the covenant emitter and tests can name the target set. */
export { TARGET_IDS };
