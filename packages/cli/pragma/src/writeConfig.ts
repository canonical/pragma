import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "smol-toml";
import type { Channel } from "./constants.js";
import resolveConfigPath from "./resolveConfigPath.js";

interface ConfigUpdate {
  tier?: string | undefined;
  channel?: Channel | undefined;
}

/**
 * Write config updates to pragma.config.toml.
 *
 * Merges updates into existing TOML. A field set to `undefined` removes it.
 * Creates the file if it doesn't exist.
 *
 * @note Impure — writes to the filesystem.
 */
export default function writeConfig(cwd: string, update: ConfigUpdate): void {
  const configPath = resolveConfigPath(cwd);

  let existing: Record<string, unknown> = {};
  try {
    const raw = readFileSync(configPath, "utf-8");
    existing = parse(raw);
  } catch {
    // File doesn't exist or is unparseable — start fresh.
  }

  if (update.tier !== undefined) {
    existing.tier = update.tier;
  } else if ("tier" in update) {
    delete existing.tier;
  }

  if (update.channel !== undefined) {
    existing.channel = update.channel;
  } else if ("channel" in update) {
    delete existing.channel;
  }

  const hasFields = Object.keys(existing).length > 0;
  if (hasFields) {
    writeFileSync(configPath, `${stringify(existing)}\n`);
  } else if (existsSync(configPath)) {
    writeFileSync(configPath, "");
  }
}

export type { ConfigUpdate };
