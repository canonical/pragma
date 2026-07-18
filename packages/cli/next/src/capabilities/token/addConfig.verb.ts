/**
 * `token add-config` — generate a terrazzo `tokens.config.mjs` (the one `token`
 * mutation). Store-backed (needsStore, per covenant) so it can report the token
 * count; plan-first through the uniform mutation seam (a tool call without
 * `confirm` returns the write plan; `--dry-run`/`--yes` on the CLI). No params —
 * the covenant emits `{ v: "add-config", mutates: true, needsStore: true }`.
 */

import type { Task } from "@canonical/task";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import { addConfigFormatters } from "./addConfig.render.js";
import type { AddConfigResult } from "./runAddConfig.js";

const addConfigVerb: VerbSpec<Record<string, unknown>, AddConfigResult> = {
  path: ["token", "add-config"],
  summary: "Generate a tokens.config.mjs for the terrazzo token pipeline.",
  doc: "Writes a terrazzo `defineConfig` at the project root, sourcing token JSON from the configured design-system packages. Store-backed so it reports how many tokens the active graph holds. Plan-first: preview without `confirm`/`--yes`.",
  params: [],
  output: { formatters: addConfigFormatters },
  examples: [
    { cmd: "pragma token add-config --dry-run", note: "preview the write" },
    { cmd: "pragma token add-config --yes", note: "write the config" },
  ],
  capability: {
    needsStore: true,
    mutates: true,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
  },
  run: (_params, rt) =>
    import("./runAddConfig.js").then((m) =>
      m.runAddConfig(rt),
    ) as unknown as Task<AddConfigResult>,
};

/** The `token add-config` verb, widened for registry composition. */
export const tokenAddConfigVerb = asVerb(addConfigVerb);
