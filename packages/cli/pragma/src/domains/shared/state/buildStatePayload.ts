/**
 * The `pragma://state` payload — ONE builder for every projection.
 *
 * The MCP `pragma://state` resource, the CLI `capabilities` state level,
 * the `capabilities` aggregator tool, and the server-instructions
 * snapshot all render from this payload, so the surfaces cannot drift.
 *
 * Per-entry shape is locked: `{ value, origin, effect, change: { durable,
 * perCall? } }` — `origin` is the config layer that supplied the value,
 * `effect` says what the value does to queries, and `change` names the
 * durable write path (and the per-call override where one exists).
 */

import { type ConfigOrigin, readConfigLayers } from "#config";
import { VERSION } from "#constants";
import { resolveTierChain } from "../filters/buildTierFilter.js";
import type { PragmaRuntime } from "../types/index.js";

/** How to change one state entry: durable write path, per-call override. */
export interface StateChange {
  /** Persisted write path: MCP tool call · CLI command. */
  readonly durable: string;
  /** Per-call override, present only where one exists (tier, detail). */
  readonly perCall?: string;
}

/** One entry of the live state map. */
export interface StateEntry {
  /** The effective value (`null` = unset). */
  readonly value: string | readonly string[] | null;
  /** Which config layer supplied the value. */
  readonly origin: ConfigOrigin;
  /** What the value does to lists and lookups. */
  readonly effect: string;
  /** How to change it. */
  readonly change: StateChange;
}

/** The full `pragma://state` payload. */
export interface StatePayload {
  readonly version: string;
  readonly state: {
    readonly tier: StateEntry;
    readonly channel: StateEntry;
    readonly detail: StateEntry;
    readonly packages: StateEntry;
  };
}

/**
 * Build the state payload from the config layers ON DISK.
 *
 * `config_*` tools write through to the config files, but a runtime's
 * merged `config` is fixed at boot — so surfaces that promise live values
 * (the `pragma://state` resource, the `capabilities` aggregator) re-read
 * the layers per call. This is what makes the instructions' "re-read
 * pragma://state after any config_* call" honest.
 *
 * @param runtime - The runtime slice carrying cwd and resolved packages.
 * @returns The state payload built from the current on-disk layers.
 * @throws PragmaError with code `CONFIG_ERROR` when a layer file is invalid.
 * @note Impure — reads config files from the filesystem.
 */
export function buildLiveStatePayload(
  runtime: Pick<PragmaRuntime, "cwd" | "packages">,
): StatePayload {
  const { config, origins } = readConfigLayers(runtime.cwd);
  return buildStatePayload({ config, origins, packages: runtime.packages });
}

/** Describe the tier filter's effect for the active tier value. */
function tierEffect(tier: string | undefined): string {
  if (tier === undefined) {
    return "No tier set — all tiers are visible to lists and lookups.";
  }
  const chain = resolveTierChain(tier).join(" > ");
  return `Lists and lookups are filtered to the tier chain ${chain}.`;
}

/**
 * Build the live state payload from a booted runtime.
 *
 * Pure projection of `runtime.config` + `runtime.origins` +
 * `runtime.packages` — no store queries, so it is safe on the boot path
 * (the instructions snapshot renders it at server construction).
 *
 * @param runtime - The runtime slice carrying config, origins, packages.
 * @returns The locked-shape state payload.
 */
export default function buildStatePayload(
  runtime: Pick<PragmaRuntime, "config" | "origins" | "packages">,
): StatePayload {
  const { config, origins } = runtime;

  return {
    version: VERSION,
    state: {
      tier: {
        value: config.tier ?? null,
        origin: origins.tier,
        effect: tierEffect(config.tier),
        change: {
          durable:
            "config_tier { path } · pragma config tier <path> [--global|--local]",
          perCall: "allTiers: true on list tools · --all-tiers",
        },
      },
      channel: {
        value: config.channel,
        origin: origins.channel,
        effect:
          "Lists and lookups include only entities whose release status is visible on this channel.",
        change: {
          durable:
            "config_channel { value } · pragma config channel <value> [--global|--local]",
        },
      },
      detail: {
        value: config.detail ?? null,
        origin: origins.detail,
        effect:
          "Default disclosure level for lookups; unset means each surface's own default (MCP: highest declared level).",
        change: {
          durable:
            "config_detail { value } · pragma config detail <level> [--global|--local]",
          perCall: "detail: <level> · --detail <level>",
        },
      },
      packages: {
        value: runtime.packages.map((pkg) => pkg.name),
        origin: origins.packages,
        effect:
          "Semantic packages whose graphs, packs, prompts, and skills are loaded.",
        change: {
          durable: "edit packages in pragma.config.json (pragma setup)",
        },
      },
    },
  };
}
