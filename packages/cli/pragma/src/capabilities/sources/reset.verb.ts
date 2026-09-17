/**
 * The `sources reset` verb — drop this project's built pack.
 *
 * A mutation (`mutates: true`) that needs neither the network nor the store:
 * like `sources update` it must not boot the store first (a project whose pack
 * it is about to unpoint may not have a bootable one at all), and unlike update
 * it never leaves the machine. Plan-first comes from the projectors, exactly as
 * it does for update — `--dry-run` previews and `--yes` confirms on the CLI, and
 * over MCP a call without `confirm` returns the plan and writes nothing.
 *
 * `destructive: true`: it removes state a user built on purpose. It is
 * reversible (`--undo` restores the pointer) and it deletes no graph data, but
 * the annotation is what tells an agent's host to ask first, and "your project
 * stops reading the pack it was reading" deserves the ask.
 */

import type { Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import type { VerbSpec } from "../../kernel/spec/index.js";
import { resetFormatters } from "./reset.render.js";
import type { SourcesResetData } from "./types.js";

/** The `sources reset` verb spec. */
export const resetVerb: VerbSpec<Record<string, unknown>, SourcesResetData> = {
  path: ["sources", "reset"],
  summary:
    "Remove this project's built pack and read the shipped snapshot again.",
  doc: "Deletes the pointer that names the pack this project reads, so reads answer from the snapshot shipped with the CLI again (or, for a project that declares its own packs, until the next `sources update`). The cached pack files are left alone — they are shared with any other project built from the same sources, and a later update reuses them. Reports calmly when nothing is built.",
  useWhen:
    "Use when asked to go back to the data shipped with the tool, dropping the pack this project built.",
  example: {},
  params: [],
  output: { formatters: resetFormatters },
  examples: [
    {
      cmd: `${BIN_NAME} sources reset`,
      note: "drop the built pack and read the shipped snapshot",
    },
    {
      cmd: `${BIN_NAME} sources reset --dry-run`,
      note: "show what would be removed",
    },
  ],
  capability: {
    needsStore: false,
    mutates: true,
    needsNetwork: false,
    destructive: true,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
  },
  // `run` really returns `Promise<Task<R>>` — the body reads config and the
  // pointer before its effects are known — presented through the `Task<R>` arm
  // by the same honest cast `sources update` uses (see `VerbSpec.run`).
  run: (_params, runtime) =>
    import("./runReset.js").then((module) =>
      module.buildResetTask(runtime),
    ) as unknown as Task<SourcesResetData>,
};
