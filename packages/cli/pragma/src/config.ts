import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, stringify } from "smol-toml";
import { type Channel, VALID_CHANNELS } from "./constants.js";

interface PragmaConfig {
  tier: string | undefined;
  channel: Channel;
}

function isValidChannel(value: unknown): value is Channel {
  return typeof value === "string" && VALID_CHANNELS.includes(value as Channel);
}

function readConfig(cwd: string = process.cwd()): PragmaConfig {
  const configPath = resolve(cwd, "pragma.config.toml");

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch {
    return { tier: undefined, channel: "normal" };
  }

  const parsed: Record<string, unknown> = parse(raw);

  const tier = typeof parsed.tier === "string" ? parsed.tier : undefined;

  let channel: Channel = "normal";
  if (parsed.channel !== undefined) {
    if (!isValidChannel(parsed.channel)) {
      throw new Error(
        `Invalid channel "${String(parsed.channel)}". Valid: ${VALID_CHANNELS.join(", ")}`,
      );
    }
    channel = parsed.channel;
  }

  return { tier, channel };
}

interface ConfigUpdate {
  tier?: string | undefined;
  channel?: Channel | undefined;
}

/**
 * Resolve the path to pragma.config.toml for a given cwd.
 */
function resolveConfigPath(cwd: string): string {
  return resolve(cwd, "pragma.config.toml");
}

/**
 * Write config updates to pragma.config.toml.
 *
 * Merges updates into existing TOML. A field set to `undefined` removes it.
 * Creates the file if it doesn't exist.
 *
 * @note Impure — writes to the filesystem.
 */
function writeConfig(cwd: string, update: ConfigUpdate): void {
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

  // Remove empty object — don't write an empty file
  const hasFields = Object.keys(existing).length > 0;
  if (hasFields) {
    writeFileSync(configPath, `${stringify(existing)}\n`);
  } else if (existsSync(configPath)) {
    writeFileSync(configPath, "");
  }
}

/**
 * Check whether a pragma.config.toml exists at the given cwd.
 */
function configExists(cwd: string): boolean {
  return existsSync(resolveConfigPath(cwd));
}

export {
  configExists,
  isValidChannel,
  readConfig,
  resolveConfigPath,
  writeConfig,
};
export type { ConfigUpdate, PragmaConfig };
