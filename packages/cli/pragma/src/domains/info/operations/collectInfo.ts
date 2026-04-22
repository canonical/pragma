import { readConfig } from "#config";
import { VERSION } from "#constants";
import { detectInstallSource, PM_COMMANDS } from "#package-manager";
import {
  type PackageRef,
  parsePackageEntry,
} from "../../refs/operations/parseRef.js";
import readGlobalRefs from "../../refs/operations/readGlobalRefs.js";
import { bootStore } from "../../shared/bootStore.js";
import { CHANNEL_RELEASES } from "../../shared/filters/buildChannelFilter.js";
import { resolveTierChain } from "../../shared/filters/buildTierFilter.js";
import { DEFAULT_PACKAGES } from "../../shared/packages.js";
import type { InfoData, PackageRefSummary } from "../types.js";
import checkRegistryVersion from "./checkRegistryVersion.js";
import { collectStoreSummary } from "./collectStoreSummary.js";

/**
 * Collects all data for the `pragma info` command.
 *
 * Reads local config, detects the package manager, checks the npm registry
 * for updates, boots a ke store, and gathers store summary statistics.
 *
 * @note Impure
 *
 * @param cwd - The current working directory used to locate `pragma.config.json`.
 * @returns A fully populated {@link InfoData} object.
 */
export default async function collectInfo(cwd: string): Promise<InfoData> {
  const install = detectInstallSource();
  const pm = install.packageManager;
  const config = readConfig(cwd);
  const tierChain = resolveTierChain(config.tier);
  const channelReleases = CHANNEL_RELEASES[config.channel];

  const registryResult = await checkRegistryVersion(
    "@canonical/pragma-cli",
    config.channel,
  );

  let update: InfoData["update"];
  const updateSkipped = registryResult === undefined;
  if (registryResult && registryResult.latest !== VERSION) {
    update = {
      current: VERSION,
      latest: registryResult.latest,
      command: PM_COMMANDS[pm].update("@canonical/pragma-cli"),
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

  // Collect package ref summaries
  const packageRefs = collectPackageRefSummaries(config.packages);

  return {
    version: VERSION,
    pm,
    installSource: install.label,
    configPath: "pragma.config.json",
    tier: config.tier,
    tierChain,
    channel: config.channel,
    channelReleases: [...channelReleases],
    update,
    updateSkipped,
    store,
    packageRefs,
  };
}

function collectPackageRefSummaries(
  projectPackages?: ReadonlyArray<
    string | { readonly name: string; readonly source?: string }
  >,
): PackageRefSummary[] {
  const entries = projectPackages ?? readGlobalRefs();
  const raw = entries.length > 0 ? entries : DEFAULT_PACKAGES.map((pkg) => pkg);

  return raw.map((entry) => refToSummary(parsePackageEntry(entry)));
}

function refToSummary(ref: PackageRef): PackageRefSummary {
  if (ref.kind === "file")
    return { pkg: ref.pkg, source: "file", detail: ref.path };
  if (ref.kind === "git")
    return { pkg: ref.pkg, source: "git", detail: `${ref.url}#${ref.ref}` };
  return { pkg: ref.pkg, source: "npm", detail: "node_modules" };
}
