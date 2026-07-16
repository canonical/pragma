/**
 * First-run onboarding — welcome note + global config creation.
 *
 * On the first invocation of pragma (detected by the absence of the global
 * config file), print a short welcome to stderr and create
 * `$XDG_CONFIG_HOME/pragma/config.json` with defaults. Modeled as a
 * {@link Task} so the effects (exists/mkdir/write/log) stay declarative and
 * testable, mirroring the config domain's write tasks.
 *
 * The banner goes to STDERR: stdout belongs to command output (`--format
 * json` consumers, MCP stdio), and the note must never corrupt it.
 */

import { dirname } from "node:path";
import {
  $,
  exists,
  gen,
  info,
  mkdir,
  type Task,
  writeFile,
} from "@canonical/task";
import { runTask } from "@canonical/task/node";
import { resolveGlobalConfigPath } from "../config/index.js";

/**
 * Seed content for a fresh global config: an empty object, so every field
 * keeps its built-in default and `config show` reports honest provenance
 * (nothing is pinned that the user did not choose).
 */
const SEED_CONFIG = "{}\n";

/** Build the welcome note. The resolved path is shown so it is copyable. */
function welcomeLines(path: string): string[] {
  return [
    "Hello! Thanks for taking the time to try the pre-release pragma CLI.",
    "Please file issues, suggestions, and feedback at https://github.com/canonical/pragma/issues.",
    `Pragma stores its configuration in ${path} (just created with defaults).`,
    "A `pragma.config.json` in the current directory or any directory above it overrides it per project.",
    "",
  ];
}

/**
 * The first-run task: create the global config, announcing it on first run.
 *
 * @returns Task yielding whether the config was created and its path.
 * @note Impure — checks/creates the global config file, emits log effects.
 */
export function firstRunTask(): Task<{ created: boolean; path: string }> {
  return gen(function* () {
    const path = resolveGlobalConfigPath();

    if (yield* $(exists(path))) {
      return { created: false, path };
    }

    // Create the config first, then greet: if creation fails the effects throw
    // before any line is emitted, so onboarding degrades to the single stderr
    // warning ensureFirstRun writes — never a "just created" banner alongside a
    // failure. `mkdir` is recursive (its default), so a missing XDG parent is
    // created rather than being treated as an error.
    yield* $(mkdir(dirname(path), true));
    yield* $(writeFile(path, SEED_CONFIG));

    for (const line of welcomeLines(path)) {
      yield* $(info(line));
    }

    return { created: true, path };
  });
}

/**
 * Run the first-run task, tolerating every failure.
 *
 * Onboarding must never break the CLI: a read-only home, a weird XDG path,
 * or a race with a concurrent first run degrade to a single stderr warning
 * and the invocation proceeds normally (the config layers treat a missing
 * global file as defaults anyway).
 *
 * @param write - Stderr sink, injectable for tests.
 * @note Impure — filesystem effects + stderr.
 */
export default async function ensureFirstRun(
  write: (line: string) => void = (line) => process.stderr.write(`${line}\n`),
): Promise<void> {
  try {
    await runTask(firstRunTask(), {
      // Route log effects to stderr without the interpreter's [INFO] prefix —
      // this is a greeting, not diagnostics.
      onLog: (_level, message) => write(message),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    write(`Warning: could not create the global pragma config — ${reason}`);
  }
}
