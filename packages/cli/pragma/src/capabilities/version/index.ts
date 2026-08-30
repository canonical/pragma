/**
 * The `version` capability barrel — the command form of `--version`.
 */

import type { CapabilityModule } from "../../kernel/spec/index.js";
import { versionVerbSpec } from "./version.verb.js";

/** The `version` capability module. */
export const versionModule: CapabilityModule = {
  name: "version",
  verbs: [versionVerbSpec],
};
