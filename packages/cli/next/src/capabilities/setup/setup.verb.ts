/**
 * The `setup` verbs — the run-all self-verb plus the four CLI-only sub-verbs
 * (`mcp`/`completions`/`skills`/`lsp`).
 *
 * `setup` is the ONE covenant noun that is BOTH directly runnable and has
 * sub-verbs (see the buildProgram mixed-noun change). All five are storeless,
 * interactive mutations. The sub-verbs are `mcp: false` (the covenant marks
 * them so — `buildServer` skips them, `buildProgram` still registers them); only
 * the self-verb `setup` is an MCP tool. Every `run` lazily imports its operation,
 * so building the tree / `--help` / `__complete` never loads `@canonical/harnesses`
 * or the effect ops. `destructive: false` (D4) keeps MCP from advertising the
 * `setup` tool as destructive.
 */

import type { Task } from "@canonical/task";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import { setupFormatters } from "./setup.render.js";
import type { SetupResult } from "./types.js";

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

/** Build a setup sub-verb from its operation module specifier. */
function subVerb(
  verb: string,
  summary: string,
  loader: (rt: PragmaRuntime) => Promise<Task<SetupResult>>,
): VerbSpec<Record<string, unknown>, SetupResult> {
  return {
    path: ["setup", verb],
    summary,
    params: [],
    output: { formatters: setupFormatters },
    capability: SUB_CAPABILITY,
    run: (_params, rt) => loader(rt) as unknown as Task<SetupResult>,
  };
}

const setupAllVerb: VerbSpec<Record<string, unknown>, SetupResult> = {
  path: ["setup"],
  summary: "Configure MCP, completions, and the LSP for this project.",
  doc: "Runs the shell-completions, LSP, and MCP installers, each behind a confirmation. Preview with --dry-run; skip prompts with --yes.",
  params: [],
  output: { formatters: setupFormatters },
  examples: [
    { cmd: "pragma setup" },
    { cmd: "pragma setup --dry-run", note: "preview every step's effects" },
    { cmd: "pragma setup mcp", note: "just the MCP server registration" },
  ],
  capability: SELF_CAPABILITY,
  run: (_params, rt) =>
    import("./operations/setupAll.js").then((m) =>
      m.setupAll(rt),
    ) as unknown as Task<SetupResult>,
};

const mcpVerb = subVerb(
  "mcp",
  "Register the pragma MCP server in detected AI harnesses.",
  (rt) => import("./operations/setupMcp.js").then((m) => m.setupMcp(rt)),
);

const completionsVerb = subVerb(
  "completions",
  "Install the shell-completion script for your shell.",
  (rt) =>
    import("./operations/setupCompletions.js").then((m) =>
      m.setupCompletions(rt),
    ),
);

const skillsVerb = subVerb(
  "skills",
  "Symlink discovered skills into each AI harness.",
  (rt) => import("./operations/setupSkills.js").then((m) => m.setupSkills(rt)),
);

const lspVerb = subVerb(
  "lsp",
  "Ensure the Terrazzo LSP VS Code extension is installed.",
  (rt) => import("./operations/setupLsp.js").then((m) => m.setupLsp(rt)),
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
