/**
 * `setup config` — seed the global config file with `{}`.
 *
 * This target exists because the seed used to happen BEFORE consent: a
 * first-run pipeline step wrote `$XDG_CONFIG_HOME/<bin>/config.json` on every
 * non-help invocation, so a read-only command mutated the machine and a banner
 * interleaved itself into mutating runs. The config layers already treat the
 * missing file as "every field at its built-in default", so nothing needed the
 * write except honesty about provenance — which is exactly the kind of thing a
 * consented setup run is for.
 *
 * Split into `detectConfigFile` (a real read of the file and its contents) and
 * the pure compose/removal bodies, like every other target.
 *
 * Removal is ownership-checked: the seeded file is deleted ONLY while it still
 * parses to `{}`. A config the user has edited is theirs, and `--undo` reports
 * that it kept it rather than quietly taking a machine's settings with it.
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  deleteFile,
  info,
  mkdir,
  sequence_,
  type Task,
  writeFile,
} from "@canonical/task";
// DIRECT LEAF IMPORT, not `config/index.js`. The barrel re-exports
// `readConfig`, which reaches `defaults.ts` → `schema.ts` → `zod`. This
// module is on the setup/doctor target table, so routing one path constant
// through the barrel would make both commands pay for the config parser
// just to compute a filename.
import { globalConfigPath } from "../../../kernel/config/paths.js";

/** Seed content: an empty object, so nothing is pinned the user did not choose. */
export const SEED_CONFIG = "{}\n";

/**
 * The detected global-config state: whether the file exists, whether it still
 * parses (an unparseable file is a real fault doctor reports), and whether it
 * is still the untouched seed (which is what makes removal safe).
 */
export interface ConfigDetection {
  readonly path: string;
  readonly exists: boolean;
  readonly parses: boolean;
  readonly isSeed: boolean;
}

/** Whether a config body is the untouched seed: valid JSON with no keys. */
function isSeedBody(body: string): boolean {
  try {
    const parsed: unknown = JSON.parse(body);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 0
    );
  } catch {
    return false;
  }
}

/**
 * Read the global config file's state up front.
 *
 * @returns The detected {@link ConfigDetection}.
 * @note Impure — reads the global config path.
 */
export async function detectConfigFile(): Promise<ConfigDetection> {
  const path = globalConfigPath();
  let body: string;
  try {
    body = readFileSync(path, "utf-8");
  } catch {
    return { path, exists: false, parses: false, isSeed: false };
  }
  let parses = true;
  try {
    JSON.parse(body);
  } catch {
    parses = false;
  }
  return { path, exists: true, parses, isSeed: isSeedBody(body) };
}

/**
 * Compose the seed write. An existing file composes NOTHING — quiet
 * convergence: a re-run must not rewrite bytes it would only replace with
 * themselves, because a byte-identical rewrite still moves the mtime and still
 * risks clobbering a concurrent edit for no gain.
 *
 * @param d - The detection gathered up front.
 * @returns A Task that seeds the config, or an empty Task when it is present.
 */
export function composeConfigFile(d: ConfigDetection): Task<void> {
  if (d.exists) return sequence_([]);
  return sequence_([
    mkdir(dirname(d.path), true),
    writeFile(d.path, SEED_CONFIG, { undo: deleteFile(d.path) }),
  ]);
}

/**
 * Compose the removal: delete the file only while it is still the untouched
 * seed. The forward effect re-asserts the seed (idempotent) and carries the
 * delete as its `undo`, which is what the undo interpreter executes.
 *
 * @param d - The detection gathered up front.
 * @returns A Task whose undo removes a seed-only config, or an empty Task.
 */
export function composeConfigRemoval(d: ConfigDetection): Task<void> {
  if (!d.exists || !d.isSeed) return sequence_([]);
  return sequence_([
    writeFile(d.path, SEED_CONFIG, { undo: deleteFile(d.path) }),
  ]);
}

/** The line a removal prints when the file carries the user's own settings. */
export const configKeptMessage = (path: string): Task<void> =>
  info(`Kept ${path} — it holds your settings.`);
