import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "smol-toml";
import { type Channel, VALID_CHANNELS } from "./constants.js";
import { PragmaError } from "./error/PragmaError.js";

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
      throw PragmaError.configError(
        `Invalid channel "${String(parsed.channel)}".`,
        { validOptions: [...VALID_CHANNELS] },
      );
    }
    channel = parsed.channel;
  }

  return { tier, channel };
}

export { readConfig };
export type { PragmaConfig };
