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
import { readConfig } from "../../config.js";
import { VERSION } from "../../constants.js";
import { detectPackageManager, PM_COMMANDS } from "../../pm.js";
import { CHANNEL_RELEASES } from "../filters/buildChannelFilter.js";
import { resolveTierChain } from "../filters/buildTierFilter.js";
import { bootStore } from "../shared/bootStore.js";
import checkRegistryVersion from "./checkRegistryVersion.js";
import { collectStoreSummary } from "./collectStoreSummary.js";
import {
  renderInfoJson,
  renderInfoLlm,
  renderInfoPlain,
} from "./renderInfo.js";
import type { InfoData } from "./types.js";

function selectInfoRenderer(
  flags: { llm: boolean; format: "text" | "json" },
): (data: InfoData) => string {
  if (flags.format === "json") return renderInfoJson;
  if (flags.llm) return renderInfoLlm;
  return renderInfoPlain;
}

async function executeInfo(
  _params: Record<string, unknown>,
  ctx: { cwd: string; globalFlags: { llm: boolean; format: "text" | "json" } },
): Promise<CommandResult> {
  const pm = detectPackageManager();
  const config = readConfig(ctx.cwd);
  const tierChain = resolveTierChain(config.tier);
  const channelReleases = CHANNEL_RELEASES[config.channel];

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

  let store: InfoData["store"];
  let keStore: Awaited<ReturnType<typeof bootStore>> | undefined;
  try {
    keStore = await bootStore({ cwd: ctx.cwd });
    store = await collectStoreSummary(keStore);
  } catch {
    // Store unavailable — show info without store section
  } finally {
    keStore?.dispose();
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

  const render = selectInfoRenderer(ctx.globalFlags);

  return {
    tag: "output",
    value: data,
    render: { plain: render },
  };
}

const infoCommand: CommandDefinition = {
  path: ["info"],
  description: "Show version, config, update status, and store summary",
  parameters: [],
  execute: executeInfo,
};

export default infoCommand;
