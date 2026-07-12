import {
  type Channel,
  type Framework,
  VALID_CHANNELS,
  VALID_FRAMEWORKS,
} from "../constants.js";
import {
  parsePackageEntry,
  type RawPackageEntry,
} from "../domains/refs/operations/parseRef.js";
import type { StoryPackDefinition } from "../domains/shared/stories/pack/types.js";
import validateStoryPackDefinition from "../domains/shared/stories/pack/validateStoryPackDefinition.js";
import { PragmaError } from "../error/PragmaError.js";
import type { ConfigFileValues } from "./types.js";

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
 * Type guard: check whether a value is a recognized framework string.
 *
 * @param value - Candidate value.
 * @returns `true` if value is a valid Framework.
 */
function isValidFramework(value: unknown): value is Framework {
  return (
    typeof value === "string" && VALID_FRAMEWORKS.includes(value as Framework)
  );
}

/**
 * Parse and validate one config file's raw contents.
 *
 * Returns only the fields the file actually sets — presence drives layer
 * merging in `readConfigLayers`. An empty or whitespace-only file sets
 * nothing.
 *
 * @param raw - The file's raw text.
 * @param sourcePath - Absolute path, used in error messages.
 * @returns The values this file declares.
 * @throws PragmaError with code `CONFIG_ERROR` on invalid JSON or values.
 */
export default function parseConfigValues(
  raw: string,
  sourcePath: string,
): ConfigFileValues {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return {};
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw PragmaError.configError(`Invalid JSON in ${sourcePath}.`);
  }

  const tier = typeof parsed.tier === "string" ? parsed.tier : undefined;

  let channel: Channel | undefined;
  if (parsed.channel !== undefined) {
    if (!isValidChannel(parsed.channel)) {
      throw PragmaError.configError(
        `Invalid channel "${String(parsed.channel)}".`,
        { validOptions: [...VALID_CHANNELS] },
      );
    }
    channel = parsed.channel;
  }

  const trace = typeof parsed.trace === "boolean" ? parsed.trace : undefined;

  let framework: Framework | undefined;
  if (parsed.framework !== undefined) {
    if (!isValidFramework(parsed.framework)) {
      throw PragmaError.configError(
        `Invalid framework "${String(parsed.framework)}".`,
        { validOptions: [...VALID_FRAMEWORKS] },
      );
    }
    framework = parsed.framework;
  }

  const packages = parsePackagesField(parsed.packages);
  const stories = parseStoriesField(parsed.stories, sourcePath);
  const prefixes = parsePrefixesField(parsed.prefixes);

  return {
    ...(tier !== undefined ? { tier } : {}),
    ...(channel !== undefined ? { channel } : {}),
    ...(packages ? { packages } : {}),
    ...(trace !== undefined ? { trace } : {}),
    ...(framework !== undefined ? { framework } : {}),
    ...(stories ? { stories } : {}),
    ...(prefixes ? { prefixes } : {}),
  };
}

/**
 * Validate and parse the experimental `stories` config field.
 *
 * @returns The validated definitions, or `undefined` when absent.
 * @throws PragmaError if the field is present but malformed.
 */
function parseStoriesField(
  raw: unknown,
  sourcePath: string,
): ReadonlyArray<StoryPackDefinition> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    throw PragmaError.configError(
      '"stories" must be an array of story-pack definitions.',
    );
  }
  return raw.map((entry, index) =>
    validateStoryPackDefinition(entry, `${sourcePath} (stories[${index}])`),
  );
}

/**
 * Validate and parse the `prefixes` config field.
 *
 * @returns The prefix map, or `undefined` when absent.
 * @throws PragmaError if the field is present but malformed.
 */
function parsePrefixesField(
  raw: unknown,
): Readonly<Record<string, string>> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw PragmaError.configError(
      '"prefixes" must be an object mapping prefix to namespace IRI.',
    );
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  for (const [prefix, namespace] of entries) {
    if (typeof namespace !== "string" || !namespace.includes("://")) {
      throw PragmaError.configError(
        `Invalid namespace for prefix "${prefix}": expected an absolute IRI.`,
      );
    }
  }
  return Object.fromEntries(entries) as Record<string, string>;
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
      '"packages" must be an array of strings or { name, source? } objects.',
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
          'Each object in "packages" must have a non-empty "name" string.',
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
      'Each entry in "packages" must be a string or { name, source? } object.',
    );
  }

  return entries;
}
