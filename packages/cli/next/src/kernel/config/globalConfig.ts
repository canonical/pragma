/**
 * Read the global machine config: `$XDG_CONFIG_HOME/pragma/config.json`.
 *
 * The global layer holds cross-project machine state (channel, detail, tier,
 * prompts). A missing or empty file contributes no values — the layer simply
 * does not participate in the merge — while malformed JSON is a loud
 * `CONFIG_ERROR` so a broken global file is fixed, not silently ignored.
 */

import { readFileSync } from "node:fs";
import { PragmaError } from "../error/PragmaError.js";
import { globalConfigPath } from "./paths.js";
import { parseRawConfig } from "./schema.js";
import type { RawConfig } from "./types.js";

/** A read of the global config layer. */
export interface GlobalConfigRead {
  readonly values: RawConfig;
  readonly exists: boolean;
  readonly path: string;
}

/**
 * Read and validate the global config file.
 *
 * @returns The declared values, whether the file exists, and its path.
 * @throws PragmaError with code `CONFIG_ERROR` on invalid JSON or shape.
 * @note Impure — reads the filesystem.
 */
export function readGlobalConfig(): GlobalConfigRead {
  const path = globalConfigPath();
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return { values: {}, exists: false, path };
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return { values: {}, exists: true, path };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw PragmaError.configError(`Invalid JSON in ${path}.`);
  }

  return { values: parseRawConfig(parsed, path), exists: true, path };
}
