/**
 * Read the read stories the ANSWERING pack carries.
 *
 * It CONSUMES the one boot decision ({@link resolveSources}) rather than
 * re-deriving it, so the nouns a project's reads answer with can never differ
 * from the nouns its pack carries: a project pointed at its own pack gets that
 * pack's stories, a fresh install gets the embedded snapshot's, and a
 * configured-but-unbuilt project gets none (its reads refuse too).
 *
 * Total: any unreadable or unparseable `stories.json` yields `[]`. The records
 * are RAW TEXT — validating them is `kernel/packs/collect.validateStories`'s
 * job, behind one guard, because a third-party story must never break a command.
 *
 * The embedded snapshot's records come from their OWN generated module, so
 * reading them costs a small string and never loads `pack.generated.ts`'s
 * ~1.9 MB of n-quads (a measured +28 ms on every invocation).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourcesDecision } from "../resolveSources.js";
import { STORIES_FILE } from "./constants.js";
import { storiesJson } from "./embedded/pack.stories.generated.js";

/** One package-declared story as the pack carries it: the file it came from, verbatim. */
export interface PackStoryRecord {
  /** Where the story was declared, e.g. `@canonical/design-system/stories/block.json`. */
  readonly source: string;
  /** The file's raw text — unparsed, uninterpreted. */
  readonly content: string;
}

/** A record shaped as this module promises — the file is a user-writable cache. */
function isRecord(value: unknown): value is PackStoryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PackStoryRecord).source === "string" &&
    typeof (value as PackStoryRecord).content === "string"
  );
}

/**
 * Parse a `stories.json` body; anything malformed degrades to no stories.
 *
 * The elements are checked, not just the container: a record that is not
 * `{ source, content }` would otherwise reach `validateStories` and be reported
 * as `Ignored story undefined: …` — a diagnostic that names no file.
 */
function parseRecords(json: string): readonly PackStoryRecord[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

/**
 * The read stories the answering pack carries.
 *
 * @param decision - The boot decision from `resolveSources`.
 * @returns The carried story records — `[]` when the pack carries none, no pack
 *   answers, or the file is unreadable.
 * @note Impure — reads `stories.json` from the answering pack directory.
 */
export function activeStories(
  decision: SourcesDecision,
): readonly PackStoryRecord[] {
  switch (decision.kind) {
    case "pack":
      try {
        return parseRecords(
          readFileSync(join(decision.dir, STORIES_FILE), "utf-8"),
        );
      } catch {
        return [];
      }
    case "embedded":
      return parseRecords(storiesJson);
    case "unavailable":
      return [];
  }
}
