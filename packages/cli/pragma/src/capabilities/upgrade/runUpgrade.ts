/**
 * Build the `upgrade` Task (lazily imported, off the fast path).
 *
 * Async-setup then compose: read the channel, detect the install source, and
 * check the registry (a preview-safe READ — no side effect), then return a Task
 * shaped by the outcome. The `exec` effect is the SOLE mutation, so the effect
 * seam does the rest for free:
 *
 * - `--dry-run` (dispatcher `dryRun`) MOCKS the exec and describes the plan —
 *   both the `Log` version-delta line AND the `Execute: <command>` line show,
 *   and nothing runs.
 * - `--yes` / MCP `confirm` runs the exec for real; a nonzero exit is surfaced
 *   by `assertExecOk` as an actionable UNSUPPORTED (exit 1) — the interpreter
 *   RESOLVES on a nonzero exit, so the check is the consumer's job.
 * - offline / already-latest carry NO exec — a real run just returns the status.
 * - a non-global install (linked / ephemeral / workspace / unknown) also
 *   carries NO exec even when an update exists: there is no command pragma may
 *   run for it, so the task reports the delta plus the state's guidance and
 *   mutates nothing. `pmUpdateCommand` only accepts the global arm, so this is
 *   enforced by the types, not by convention.
 *
 * The whole registry read is preview-safe, so no `mutation.preview` gating is
 * needed here (unlike `sources update`, whose heavy resolve must be gated).
 * `run` returns `Promise<Task<R>>`, presented through the `Task<R>` arm by the
 * honest cast at the verb (the `update.verb.ts` precedent).
 */

import { $, exec, gen, info, type Task, warn } from "@canonical/task";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import {
  assertExecOk,
  checkRegistryVersion,
  detectInstallSource,
  guardMissingBinary,
  PRAGMA_PACKAGE,
  pmUpdateCommand,
  updateGuidance,
} from "../shared/index.js";
import type { UpgradeData } from "./types.js";

/**
 * Resolve the upgrade state and compose the corresponding Task.
 *
 * @param rt - The per-invocation runtime.
 * @returns A Task yielding the upgrade outcome (its exec runs only on a real,
 *   update-needed execution).
 * @note Impure — reads the config + the registry (the exec is the only mutation,
 *   and it runs only under a real, update-needed execution).
 */
export async function runUpgrade(
  rt: PragmaRuntime,
): Promise<Task<UpgradeData>> {
  const { channel } = (await rt.loadConfig()).config;
  const install = detectInstallSource();
  // Only a GLOBAL install has a sanctioned update command — the type of
  // `pmUpdateCommand` enforces the narrowing. A linked checkout in particular
  // must never be handed `npm i -g`: it would overwrite the development link.
  const command =
    install.kind === "global"
      ? pmUpdateCommand(install, PRAGMA_PACKAGE)
      : undefined;
  const pm = install.label;
  const kind = install.kind;
  const current = rt.version;

  const registry = await checkRegistryVersion(PRAGMA_PACKAGE, channel);

  if (registry === undefined) {
    const data: UpgradeData = {
      pm,
      kind,
      current,
      latest: undefined,
      ...(command !== undefined ? { command } : {}),
      offline: true,
      alreadyLatest: false,
      executed: false,
    };
    return gen(function* () {
      yield* $(warn("Cannot reach the registry — skipped the update check."));
      return data;
    });
  }

  if (registry.latest === current) {
    const data: UpgradeData = {
      pm,
      kind,
      current,
      latest: registry.latest,
      ...(command !== undefined ? { command } : {}),
      offline: false,
      alreadyLatest: true,
      executed: false,
    };
    return gen(function* () {
      yield* $(info(`Already at the latest version (${current}).`));
      return data;
    });
  }

  if (install.kind !== "global") {
    // An update exists, but this install has no command pragma may run for
    // it — say so honestly and run NOTHING. (The discriminant narrowing is
    // what lets `updateGuidance` accept `install` here.)
    const guidance = updateGuidance(install);
    const data: UpgradeData = {
      pm,
      kind,
      current,
      latest: registry.latest,
      guidance,
      offline: false,
      alreadyLatest: false,
      executed: false,
    };
    return gen(function* () {
      yield* $(info(`${current} → ${registry.latest}`));
      yield* $(warn(`No automatic upgrade for this install: ${guidance}`));
      return data;
    });
  }

  const updateCommand = pmUpdateCommand(install, PRAGMA_PACKAGE);
  const data: UpgradeData = {
    pm,
    kind,
    current,
    latest: registry.latest,
    command: updateCommand,
    offline: false,
    alreadyLatest: false,
    executed: true,
  };
  const parts = updateCommand.split(" ");
  const bin = parts[0] ?? "npm";
  const args = parts.slice(1);
  // Guard the spawn: an absent package manager (`bin` not on PATH) REJECTS the
  // exec with ENOENT, which would collapse to INTERNAL_ERROR ("report
  // this issue"). Surface it as a named "`<pm>` not found on PATH" instead.
  return guardMissingBinary(
    bin,
    {
      message: `Install ${pm} (or your package manager) and ensure it is on your PATH, then try again.`,
    },
    gen(function* () {
      // The version-delta rides a Log effect, so `--dry-run` describes it too.
      yield* $(info(`${current} → ${registry.latest}`));
      // The one mutation — mocked under dry-run, run for real under --yes/confirm.
      // The interpreter RESOLVES on a nonzero exit (only a spawn error rejects),
      // so inspect the result: a failed install (e.g. EACCES on a global
      // `npm i -g`) must fail loudly, not report a silent success.
      const result = yield* $(exec(bin, args, rt.cwd));
      assertExecOk(updateCommand, result);
      return data;
    }),
  );
}
