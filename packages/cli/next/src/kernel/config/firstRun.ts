/**
 * First-run onboarding — welcome note + global config creation.
 *
 * On the first invocation (detected by the absence of the global config file),
 * greet on STDERR and seed `$XDG_CONFIG_HOME/pragma/config.json` with `{}` so
 * every field keeps its built-in default and `config show` reports honest
 * provenance. Modeled as a {@link Task} so the effects stay declarative and
 * testable. The banner goes to stderr — stdout belongs to command output
 * (`--format json`, MCP stdio) and must never be corrupted. Ported from the v1
 * first-run pipeline; runs before dispatch and tolerates every failure.
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
import { globalConfigPath } from "./paths.js";

/** Seed content: an empty object, so nothing is pinned the user did not choose. */
const SEED_CONFIG = "{}\n";

/** Build the welcome note; the resolved path is shown so it is copyable. */
function welcomeLines(path: string): string[] {
  return [
    "Hello! Thanks for taking the time to try the pre-release pragma CLI.",
    "Please file issues and feedback at https://github.com/canonical/pragma/issues.",
    `Pragma stores its configuration in ${path} (just created with defaults).`,
    "A `pragma.config.ts` in this directory or above it overrides it per project.",
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
    const path = globalConfigPath();

    if (yield* $(exists(path))) {
      return { created: false, path };
    }

    // Create first, then greet: if creation fails the effects throw before any
    // line is emitted, so onboarding degrades to the single stderr warning
    // rather than a "just created" banner alongside a failure.
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
 * Onboarding must never break an invocation: a read-only home or a race with a
 * concurrent first run degrades to a single stderr warning and the invocation
 * proceeds (the config layers treat a missing global file as defaults anyway).
 *
 * @param write - Stderr sink, injectable for tests.
 * @note Impure — filesystem effects + stderr.
 */
export async function ensureFirstRun(
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
