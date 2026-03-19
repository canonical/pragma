/**
 * `pragma info` command definition.
 *
 * Shows version, install method, config summary, update availability,
 * and store summary.
 *
 * @note Impure — reads config, queries registry, queries store.
 * @see IN.04, IN.06, IN.08 in B.11.INSTALL
 */

import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import chalk from "chalk";
import { readConfig } from "../../config.js";
import { VERSION } from "../../constants.js";
import { PragmaError } from "../../error/index.js";
import {
  formatField,
  formatHeading,
} from "../../lib/formatTerminal.js";
import { detectPackageManager, PM_COMMANDS } from "../../pm.js";
import { CHANNEL_RELEASES } from "../filters/buildChannelFilter.js";
import { resolveTierChain } from "../filters/buildTierFilter.js";
import { bootStore } from "../shared/bootStore.js";
import { checkRegistryVersion } from "./checkRegistryVersion.js";
import { collectStoreSummary } from "./collectStoreSummary.js";

interface InfoData {
  readonly version: string;
  readonly pm: string;
  readonly configPath: string;
  readonly tier: string | undefined;
  readonly tierChain: readonly string[];
  readonly channel: string;
  readonly channelReleases: readonly string[];
  readonly update:
    | { readonly current: string; readonly latest: string; readonly command: string }
    | undefined;
  readonly updateSkipped: boolean;
  readonly store:
    | { readonly tripleCount: number; readonly graphNames: readonly string[] }
    | undefined;
}

function renderInfoPlain(data: InfoData): string {
  const lines: string[] = [];

  lines.push(`pragma v${data.version}`);

  // Install method
  lines.push(formatField("  Installed via:", `${data.pm} (global)`));

  // Config
  lines.push(formatField("  Config:", data.configPath));

  if (data.tier) {
    const chain = data.tierChain.join(" → ");
    lines.push(formatField("    tier:", `${data.tier} (${chain})`));
  } else {
    lines.push(formatField("    tier:", "(none)"));
  }

  const releases = data.channelReleases.join(", ");
  lines.push(formatField("    channel:", `${data.channel} (${releases})`));

  // Update
  lines.push("");
  lines.push(formatHeading("Update"));
  if (data.update) {
    lines.push(
      `  ${data.update.current} → ${chalk.green(data.update.latest)} available`,
    );
    lines.push(`  Run ${chalk.cyan(`\`${data.update.command}\``)} to upgrade.`);
    lines.push(`  Or run ${chalk.cyan("`pragma upgrade`")}.`);
  } else if (data.updateSkipped) {
    lines.push("  Upgrade check skipped (offline)");
  } else {
    lines.push("  Up to date.");
  }

  // Store
  if (data.store) {
    lines.push("");
    lines.push(formatHeading("Store"));
    lines.push(
      formatField(
        "  Triples:",
        data.store.tripleCount.toLocaleString(),
      ),
    );
    if (data.store.graphNames.length > 0) {
      lines.push(
        formatField(
          "  Graphs:",
          `default, ${data.store.graphNames.join(", ")}`,
        ),
      );
    } else {
      lines.push(formatField("  Graphs:", "default"));
    }
  }

  return lines.join("\n");
}

function renderInfoLlm(data: InfoData): string {
  const lines: string[] = [];

  lines.push(`# pragma v${data.version}`);
  lines.push(`- Installed via: ${data.pm} (global)`);

  if (data.tier) {
    lines.push(`- Tier: ${data.tier} (${data.tierChain.join(" → ")})`);
  } else {
    lines.push("- Tier: (none)");
  }
  lines.push(
    `- Channel: ${data.channel} (${data.channelReleases.join(", ")})`,
  );

  if (data.update) {
    lines.push(
      `- Update: ${data.update.current} → ${data.update.latest} available`,
    );
  } else if (data.updateSkipped) {
    lines.push("- Update: check skipped (offline)");
  } else {
    lines.push("- Update: up to date");
  }

  if (data.store) {
    lines.push(`- Store: ${data.store.tripleCount.toLocaleString()} triples`);
    if (data.store.graphNames.length > 0) {
      lines.push(
        `- Graphs: default, ${data.store.graphNames.join(", ")}`,
      );
    }
  }

  return lines.join("\n");
}

function renderInfoJson(data: InfoData): string {
  return JSON.stringify(data, null, 2);
}

async function executeInfo(
  _params: Record<string, unknown>,
  ctx: { cwd: string; globalFlags: { llm: boolean; format: "text" | "json" } },
): Promise<CommandResult> {
  const pm = detectPackageManager();
  const config = readConfig(ctx.cwd);
  const tierChain = resolveTierChain(config.tier);
  const channelReleases = CHANNEL_RELEASES[config.channel];

  // Registry check (IN.08: 3s timeout, offline fallback)
  const registryResult = await checkRegistryVersion(
    "@canonical/pragma",
    config.channel,
  );

  let update: InfoData["update"];
  const updateSkipped = registryResult === undefined;
  if (registryResult && registryResult.latest !== VERSION) {
    update = {
      current: VERSION,
      latest: registryResult.latest,
      command: PM_COMMANDS[pm].update("@canonical/pragma"),
    };
  }

  // Store summary (optional — may fail if packages not installed)
  let store: InfoData["store"];
  try {
    const keStore = await bootStore({ cwd: ctx.cwd });
    store = await collectStoreSummary(keStore);
    keStore.dispose();
  } catch {
    // Store unavailable — show info without store section
  }

  const data: InfoData = {
    version: VERSION,
    pm,
    configPath: "pragma.config.toml",
    tier: config.tier,
    tierChain,
    channel: config.channel,
    channelReleases: [...channelReleases],
    update,
    updateSkipped,
    store,
  };

  return {
    tag: "output",
    value: data,
    render: {
      plain: (d: InfoData) => {
        if (ctx.globalFlags.format === "json") return renderInfoJson(d);
        if (ctx.globalFlags.llm) return renderInfoLlm(d);
        return renderInfoPlain(d);
      },
    },
  };
}

const infoCommand: CommandDefinition = {
  path: ["info"],
  description: "Show version, config, update status, and store summary",
  parameters: [],
  execute: executeInfo,
};

export { infoCommand, renderInfoJson, renderInfoLlm, renderInfoPlain };
export type { InfoData };
