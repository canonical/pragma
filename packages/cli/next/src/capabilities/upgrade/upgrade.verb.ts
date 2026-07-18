/**
 * The `upgrade` verb spec (noun `upgrade`, self-verb).
 *
 * A storeless, network-touching mutation: check the registry, then run the
 * package-manager update. `destructive: false` is load-bearing (D4) — upgrading
 * replaces the binary, it destroys no user data — so `annotationsFor` emits
 * `destructiveHint: false` rather than letting MCP clients default an unset hint
 * on a non-read-only tool to `true`.
 *
 * `run` returns `Promise<Task<UpgradeData>>` (async registry read before the
 * effects are known) presented through the `Task<R>` arm by the honest cast —
 * the `update.verb.ts` precedent; a literal `Promise<Task>` union arm would
 * poison async read-verb inference.
 */

import type { Task } from "@canonical/task";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";
import type { UpgradeData } from "./types.js";
import { upgradeFormatters } from "./upgrade.render.js";

const upgradeVerb: VerbSpec<Record<string, unknown>, UpgradeData> = {
  path: ["upgrade"],
  summary: "Upgrade the pragma CLI to the latest version.",
  doc: "Checks the registry for the active channel's latest release and runs your package manager's global-update command. Preview it with --dry-run.",
  params: [],
  output: { formatters: upgradeFormatters },
  examples: [
    { cmd: "pragma upgrade" },
    { cmd: "pragma upgrade --dry-run", note: "show the delta and the command" },
  ],
  capability: {
    needsStore: false,
    mutates: true,
    destructive: false,
    needsNetwork: true,
    mcp: {
      expose: true,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
  },
  run: (_params, runtime) =>
    import("./runUpgrade.js").then((m) =>
      m.runUpgrade(runtime),
    ) as unknown as Task<UpgradeData>,
};

/** The `upgrade` capability module. */
export const upgradeModule: CapabilityModule = {
  name: "upgrade",
  verbs: [asVerb(upgradeVerb)],
};
