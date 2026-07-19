/**
 * The `setup` verbs — the run-all self-verb plus the four CLI-only sub-verbs
 * (`mcp`/`completions`/`skills`/`lsp`).
 *
 * `setup` is the ONE covenant noun that is BOTH directly runnable and has
 * sub-verbs (see the buildProgram mixed-noun change). All five are storeless,
 * interactive mutations. The sub-verbs are `mcp: false` (the covenant marks
 * them so — `buildServer` skips them, `buildProgram` still registers them); only
 * the self-verb `setup` is an MCP tool. `destructive: false` (D4) keeps MCP from
 * advertising the `setup` tool as destructive.
 *
 * ALL FIVE now flow through the SAME summon `execute` seam `create` uses: each
 * `run` synthesizes a `GeneratorDefinition` (detection up front, a pure
 * `generate`), picks the Ink wizard / auto / MCP strategy off `rt.interaction`,
 * and returns `execute` — so setup inherits the recap, live progress, colours,
 * and the shared cancel fixes. summon-core + the generator ops stay behind a
 * LAZY dynamic import (mirroring `create`'s `loadCreateRuntime`), so building the
 * command tree / `--help` / `__complete` — and `setup --yes` — load no
 * React/Ink. `params: []` on every verb keeps the command surface frozen.
 */

import type { GeneratorResult } from "@canonical/summon-core";
import { $, gen, type Task } from "@canonical/task";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { setupFormatters } from "./setup.render.js";
import type { SetupMode, SetupResult } from "./types.js";

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
 * generator ops, build the plan (detection up front), pick the prompt strategy
 * off `rt.interaction`, wire `rt.exec`, and return `execute` mapped back onto
 * {@link SetupResult}.
 *
 * NOTE: `rt.exec` carries NO per-call `cwd`. Unlike `create` (whose generator
 * emits RELATIVE paths jailed to `rt.cwd`), setup's ops build ABSOLUTE effect
 * paths themselves ($HOME/…, resolve(cwd,…)); the interpreter leaves absolute
 * paths unchanged, so no per-call write root is threaded. No stamping either —
 * setup writes symlinks / config / scripts, not generated source.
 *
 * @param mode - Which entry point (`all` or one sub-verb).
 * @param rt - The per-invocation runtime (mutated: `rt.exec` is set).
 * @returns The `Task<SetupResult>` the dispatcher/MCP handler interprets.
 * @note Impure — runs each step's real detection; may throw EMPTY_RESULTS
 *   (direct `setup skills` with no skills) before returning a Task.
 */
async function runSetup(
  mode: SetupMode,
  rt: PragmaRuntime,
): Promise<Task<SetupResult>> {
  // Lazy dynamic imports (R1 lazy-React discipline): summon-core's barrel is
  // React-free, and the non-TTY branch picks autoPrompt/mcpPrompt (never mounts
  // Ink), so `setup --yes` loads no React — the guard test enforces this.
  const [summon, ops] = await Promise.all([
    import("@canonical/summon-core"),
    import("./operations/setupGenerator.js"),
  ]);

  const { generator, toResult } = await ops.buildSetupPlan(rt, mode);

  const { isTTY, transport, yes, signal, abort } = rt.interaction ?? {
    isTTY: false,
    transport: "cli" as const,
    yes: true,
  };

  // TTY without --yes → the Ink wizard (recap + live progress). Its callbacks
  // ride rt.exec; `onCancel` threads the run's abort in so an in-Ink Ctrl-C
  // during execution actually stops the writes (H2). No stamping (A5).
  let task: Task<GeneratorResult>;
  if (isTTY && !yes) {
    const session = summon.inkPrompt(generator, { signal, onCancel: abort });
    rt.exec = {
      promptHandler: session.promptHandler,
      onEffectStart: session.onEffectStart,
      onEffectComplete: session.onEffectComplete,
      onLog: session.onLog,
      dispose: session.dispose,
      signal,
    };
    task = summon.execute(generator, {
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
    task = summon.execute(generator, { prompt, params: {}, signal });
  }

  // execute yields a GeneratorResult; map it back onto setup's tagged result
  // union (its --format json shape is frozen). The completion view is driven by
  // controller phase, not this value, so mapping after execute is invisible to
  // the wizard.
  return gen(function* () {
    const result = yield* $(task);
    return toResult(result.answers);
  });
}

/** Build a setup verb bound to its {@link SetupMode}. */
function setupVerb(
  path: VerbSpec<Record<string, unknown>, SetupResult>["path"],
  summary: string,
  mode: SetupMode,
  capability: typeof SELF_CAPABILITY | typeof SUB_CAPABILITY,
  extras: Partial<VerbSpec<Record<string, unknown>, SetupResult>> = {},
): VerbSpec<Record<string, unknown>, SetupResult> {
  return {
    path,
    summary,
    params: [],
    output: { formatters: setupFormatters },
    capability,
    ...extras,
    run: (_params, rt) => runSetup(mode, rt) as unknown as Task<SetupResult>,
  };
}

const setupAllVerb = setupVerb(
  ["setup"],
  "Configure MCP, completions, skills, and the LSP for this project.",
  "all",
  SELF_CAPABILITY,
  {
    doc: "Runs the shell-completions, LSP, MCP, and skills installers as a single wizard: pick the steps, review the recap, then apply.",
    examples: [
      { cmd: "pragma setup" },
      { cmd: "pragma setup --dry-run", note: "preview every step's effects" },
      { cmd: "pragma setup mcp", note: "just the MCP server registration" },
    ],
  },
);

const mcpVerb = setupVerb(
  ["setup", "mcp"],
  "Register the pragma MCP server in detected AI harnesses.",
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

/** The `setup` capability module (run-all self-verb + four CLI-only sub-verbs). */
export const setupModule: CapabilityModule = {
  name: "setup",
  verbs: [
    asVerb(setupAllVerb),
    asVerb(mcpVerb),
    asVerb(completionsVerb),
    asVerb(skillsVerb),
    asVerb(lspVerb),
  ],
};
