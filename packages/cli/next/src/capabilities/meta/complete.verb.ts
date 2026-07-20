/**
 * The hidden `__complete` verb — the dynamic shell-completion resolver.
 *
 * Declared as a verb so the grammar is the single registry (every command is a
 * verb, even internal ones), but `hidden` so it never shows in help or the
 * surface, and withheld from MCP with a reason. The bin fast-paths `__complete`
 * for latency; this spec's lazy `run` is the same resolution — the full
 * completion engine, fed by the active pack's index through
 * `indexCompletionEnv(runtime.cwd)` — reachable if a future tier dispatches it.
 * Storeless: the entity tier reads the index off disk, never booting the store.
 */

import type { VerbSpec } from "../../kernel/spec/types.js";

/** The `__complete` verb spec. */
export const completeVerb: VerbSpec<Record<string, unknown>, string[]> = {
  path: ["__complete"],
  summary: "Resolve shell completions for the given words.",
  hidden: true,
  params: [
    {
      kind: "string[]",
      name: "words",
      doc: "The command words typed so far (last is the partial).",
      positional: true,
    },
  ],
  output: {
    formatters: {
      plain: (matches) => matches.join("\n"),
      llm: (matches) => matches.join("\n"),
      json: (matches) => JSON.stringify(matches),
    },
  },
  capability: {
    needsStore: false,
    mutates: false,
    mcp: { expose: false, reason: "internal shell-completion resolver" },
  },
  run: (params, runtime) =>
    Promise.all([
      import("../../kernel/completion/complete.js"),
      import("../../kernel/completion/entitySource.js"),
      import("../index.js"),
    ]).then(([completion, entitySource, caps]) =>
      completion.runComplete(
        (params.words as string[] | undefined) ?? [],
        caps.capabilities,
        entitySource.indexCompletionEnv(runtime.cwd),
      ),
    ),
};
