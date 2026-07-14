import type { Channel } from "../constants.js";
import type { RawPackageEntry } from "../domains/refs/operations/parseRef.js";
import { PragmaError } from "../error/PragmaError.js";
import defaultsDocument from "./defaults.json" with { type: "json" };
import parseConfigValues from "./parseConfigValues.js";
import type { ConfigFileValues } from "./types.js";

/** The built-in defaults with the fields every install relies on present. */
interface DefaultConfig extends ConfigFileValues {
  /** Release channel active when no config file sets one. */
  readonly channel: Channel;
  /** Semantic packages loaded when no config or global refs declare any. */
  readonly packages: ReadonlyArray<RawPackageEntry>;
}

/**
 * Validate the embedded defaults document into the built-in config layer.
 *
 * The document goes through the same parser as user config files, so an
 * invalid edit to `defaults.json` fails loudly at first import (and in
 * tests) instead of silently changing behavior.
 *
 * @throws PragmaError with code `CONFIG_ERROR` when the document is
 *         invalid or misses a required default.
 */
function parseDefaultsDocument(): DefaultConfig {
  const values = parseConfigValues(
    JSON.stringify(defaultsDocument),
    "built-in defaults (src/config/defaults.json)",
  );
  if (values.channel === undefined) {
    throw PragmaError.configError("Built-in defaults must declare a channel.", {
      recovery: { message: "Restore `channel` in src/config/defaults.json." },
    });
  }
  if (values.packages === undefined || values.packages.length === 0) {
    throw PragmaError.configError(
      "Built-in defaults must declare at least one semantic package.",
      {
        recovery: {
          message: "Restore `packages` in src/config/defaults.json.",
        },
      },
    );
  }
  return { ...values, channel: values.channel, packages: values.packages };
}

/**
 * The built-in configuration layer, sourced from the embedded declarative
 * `defaults.json` document rather than hardcoded values.
 *
 * `packages` is deliberately NOT surfaced through the layered `pick()` in
 * `readConfigLayers` — it feeds `DEFAULT_PACKAGES` (and from there the
 * ref merge), where global `refs.json` entries still merge over it by
 * package name. Sourcing it as an ordinary config layer would make it
 * look user-declared and shut global refs out.
 */
export const DEFAULT_CONFIG: DefaultConfig = parseDefaultsDocument();
