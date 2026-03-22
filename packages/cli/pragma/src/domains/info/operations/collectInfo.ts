/**
 * Collect all data for the `pragma info` command.
 *
 * @note Impure — reads config, queries registry, queries store.
 * @see IN.04, IN.06, IN.08 in B.11.INSTALL
 */

import { readConfig } from "#config";
import { VERSION } from "#constants";
import { detectPackageManager, PM_COMMANDS } from "#package-manager";
import { bootStore } from "../../shared/bootStore.js";
import { CHANNEL_RELEASES } from "../../shared/filters/buildChannelFilter.js";
import { resolveTierChain } from "../../shared/filters/buildTierFilter.js";
import type { InfoData } from "../types.js";
import checkRegistryVersion from "./checkRegistryVersion.js";
import { collectStoreSummary } from "./collectStoreSummary.js";

export default async function collectInfo(cwd: string): Promise<InfoData> {
  const pm = detectPackageManager();
  const config = readConfig(cwd);
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
    keStore = await bootStore({ cwd });
    store = await collectStoreSummary(keStore);
  } catch {
    // Store unavailable — show info without store section
  } finally {
    keStore?.dispose();
  }

  return {
    version: VERSION,
    pm,
    configPath: "pragma.config.json",
    tier: config.tier,
    tierChain,
    channel: config.channel,
    channelReleases: [...channelReleases],
    update,
    updateSkipped,
    store,
  };
}
