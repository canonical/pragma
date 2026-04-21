import { readFileSync } from "node:fs";
import { type Channel, VALID_CHANNELS } from "../constants.js";
import {
  type RawPackageEntry,
  parsePackageEntry,
} from "../domains/refs/operations/parseRef.js";
import { PragmaError } from "../error/PragmaError.js";
import resolveConfigPath from "./resolveConfigPath.js";
import type { PragmaConfig } from "./types.js";

/**
 * Type guard: check whether a value is a recognized channel string.
 *
 * @param value - Candidate value.
 * @returns `true` if value is a valid Channel.
 */
function isValidChannel(value: unknown): value is Channel {
  return typeof value === "string" && VALID_CHANNELS.includes(value as Channel);
}

/**
 * Read pragma config from `pragma.config.json` in the given directory.
 *
 * Returns defaults (no tier, `"normal"` channel) when the file is missing or empty.
 *
 * @param cwd - Directory containing pragma.config.json (defaults to `process.cwd()`).
 * @returns Parsed configuration.
 * @throws PragmaError with code `CONFIG_ERROR` if JSON is invalid or channel is unrecognized.
 *
 * @note Impure — reads config from filesystem.
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

  const packages = parsePackagesField(parsed.packages);

  return packages ? { tier, channel, packages } : { tier, channel };
}

// ---------------------------------------------------------------------------
// Packages field parsing
// ---------------------------------------------------------------------------

/**
 * Validate and parse the `packages` config field.
 *
 * @returns The validated array, or `undefined` when the field is absent.
 * @throws PragmaError if the field is present but malformed.
 */
function parsePackagesField(
  raw: unknown,
): ReadonlyArray<RawPackageEntry> | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (!Array.isArray(raw)) {
    throw PragmaError.configError(
      "\"packages\" must be an array of strings or { name, source? } objects.",
    );
  }

  const entries: RawPackageEntry[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      entries.push(item);
      continue;
    }
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      if (typeof obj.name !== "string" || obj.name.length === 0) {
        throw PragmaError.configError(
          "Each object in \"packages\" must have a non-empty \"name\" string.",
        );
      }
      const entry: { name: string; source?: string } = { name: obj.name };
      if (obj.source !== undefined) {
        if (typeof obj.source !== "string") {
          throw PragmaError.configError(
            `Invalid source for "${obj.name}": expected a string.`,
          );
        }
        entry.source = obj.source;
      }
      // Validate format eagerly — fail fast on bad config
      parsePackageEntry(entry);
      entries.push(entry);
      continue;
    }
    throw PragmaError.configError(
      "Each entry in \"packages\" must be a string or { name, source? } object.",
    );
  }

  return entries;
}
