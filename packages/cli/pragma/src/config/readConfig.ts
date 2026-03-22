import { readFileSync } from "node:fs";
import { type Channel, VALID_CHANNELS } from "../constants.js";
import { PragmaError } from "../error/PragmaError.js";
import resolveConfigPath from "./resolveConfigPath.js";
import type { PragmaConfig } from "./types.js";

function isValidChannel(value: unknown): value is Channel {
  return typeof value === "string" && VALID_CHANNELS.includes(value as Channel);
}

/**
 * Read pragma config from `pragma.config.json` in the given directory.
 *
 * @note Impure — reads config from filesystem.
 * @throws PragmaError with code CONFIG_ERROR if JSON is invalid or channel is unrecognized.
 */
export default function readConfig(cwd: string = process.cwd()): PragmaConfig {
  const configPath = resolveConfigPath(cwd);

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch {
    return { tier: undefined, channel: "normal" };
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return { tier: undefined, channel: "normal" };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw PragmaError.configError(`Invalid JSON in ${configPath}.`);
  }

  const tier = typeof parsed.tier === "string" ? parsed.tier : undefined;

  let channel: Channel = "normal";
  if (parsed.channel !== undefined) {
    if (!isValidChannel(parsed.channel)) {
      throw PragmaError.configError(
        `Invalid channel "${String(parsed.channel)}".`,
        { validOptions: [...VALID_CHANNELS] },
      );
    }
    channel = parsed.channel;
  }

  return { tier, channel };
}
