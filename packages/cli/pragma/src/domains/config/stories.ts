/**
 * Config read story — the single declaration of `config show` for both
 * surfaces.
 *
 * Both surfaces resolve from the filesystem, so the MCP tool now reports
 * the real config path and existence (it previously hardcoded
 * `pragma.config.json` / `true` regardless of the working directory).
 */

import { readConfigLayers } from "#config";
import { detectInstallSource } from "#package-manager";
import type { ReadStory } from "../shared/stories/index.js";
import { showFormatters } from "./formatters/index.js";
import { resolveConfigShow } from "./operations/index.js";
import type { ConfigShowData } from "./operations/types.js";

/** The `config show` / `config_show` read story. */
export const configShowStory: ReadStory<ConfigShowData, ConfigShowData> = {
  noun: "config",
  verb: "show",
  description: "Display resolved configuration",
  toolDescription:
    "Show current pragma configuration (tier and channel settings). Use " +
    "when checking the active scope before querying. Example: config_show {}.",
  params: [],
  examples: ["pragma config show"],
  resolve: async (rt) => {
    const layers = readConfigLayers(rt.cwd);
    const install = detectInstallSource();
    return resolveConfigShow(layers.config, {
      packageManager: install.packageManager,
      installSource: install.label,
      configFilePath: layers.project.path,
      configFileExists: layers.project.exists,
      globalConfigPath: layers.global.path,
      globalConfigExists: layers.global.exists,
      origins: layers.origins,
    });
  },
  toOutput: (data) => data,
  formatters: showFormatters,
  toEnvelope: (data) => ({ data }),
};
