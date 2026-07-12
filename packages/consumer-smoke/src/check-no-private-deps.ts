#!/usr/bin/env bun
/**
 * check-no-private-deps.ts — static consumer-installability guard AND
 * release-readiness inventory.
 *
 * Dependency-edge guard: for every publishable workspace package
 * (private !== true), asserts that none of its production dependencies
 * (dependencies, peerDependencies, optionalDependencies) would break an
 * external `npm install` of the published package:
 *
 *   ERROR  dep is a workspace package with `private: true`
 *          (it will never exist on npm — the #599 failure class)
 *   ERROR  dep uses a non-registry protocol (`workspace:`, `file:`,
 *          `link:`, `portal:`) that only resolves inside this monorepo
 *   ERROR  dep is a publishable workspace package that has NEVER been
 *          published to npm (registry 404). In `--mode=publish` this is
 *          downgraded to a warning, because `lerna publish from-package`
 *          publishes it in the same run.
 *   WARN   dep is a published workspace package but no published version
 *          satisfies the declared range (expected transiently between a
 *          version bump and the publish that follows it).
 *   Fail-closed: when the registry cannot be queried (rate limit, outage)
 *          the dep is reported as UNDETERMINED — WARN in pr mode, ERROR in
 *          publish mode — never silently treated as published.
 *
 * Inventory: additionally, EVERY publishable package's own publication
 * status is checked (not just packages appearing as dependencies), and the
 * complete set of never-published packages is reported together, one per
 * line. These are report/warning lines, not errors — an experimental
 * package may legitimately not be published yet — but a published package
 * DEPENDING on one stays a hard error per the edge guard above.
 *
 * All registry lookups run as @canonical/task effects in one deduplicated
 * parallel batch (see registry.ts).
 *
 * Usage:
 *   bun packages/consumer-smoke/src/check-no-private-deps.ts [--mode=pr|publish]
 *
 * Exits non-zero if any ERROR is found.
 */

import { runTask } from "@canonical/task";
import { analyze, collectRegistryLookups } from "./analysis.js";
import { scrubProcessEnv } from "./env.js";
import { registryStatusesTask } from "./registry.js";
import { getWorkspacePackages } from "./workspace.js";

// Child processes (npm, spawned by the task interpreter) inherit our env;
// they need no credentials, so drop token/secret-shaped variables first.
scrubProcessEnv();

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = modeArg ? modeArg.slice("--mode=".length) : "pr";
if (mode !== "pr" && mode !== "publish") {
  console.error(`Unknown --mode=${mode}; expected "pr" or "publish".`);
  process.exit(2);
}

const packages = getWorkspacePackages();
const lookups = collectRegistryLookups(packages);

const registryStart = Date.now();
const statuses = await runTask(registryStatusesTask(lookups));
console.log(
  `registry: ${lookups.length} unique package lookups in ${((Date.now() - registryStart) / 1000).toFixed(1)}s (parallel @canonical/task effects)`,
);

const { findings, inventory, publishableCount } = analyze({
  packages,
  statuses,
  mode,
});

// ---- Release-readiness inventory: every unpublished package, together ----
console.log("\n=== Release-readiness inventory: unpublished packages ===");
if (inventory.length === 0) {
  console.log(
    `all ${publishableCount} publishable packages exist on the npm registry`,
  );
} else {
  for (const entry of inventory) {
    const label =
      entry.status === "never-published"
        ? "NEVER PUBLISHED"
        : `UNDETERMINED (${entry.reason})`;
    console.log(
      `UNPUBLISHED  ${entry.name} (${entry.relDir}) — local ${entry.version || "?"} — ${label}`,
    );
  }
  const neverPublished = inventory.filter(
    (entry) => entry.status === "never-published",
  ).length;
  console.log(
    `${inventory.length} of ${publishableCount} publishable packages are not on npm (${neverPublished} never published, ${inventory.length - neverPublished} undetermined)`,
  );
}

// ---- Findings ------------------------------------------------------------
const errors = findings.filter((finding) => finding.level === "error");
const warnings = findings.filter((finding) => finding.level === "warn");

if (findings.length > 0) console.log("");
for (const finding of warnings) console.warn(`WARN  ${finding.message}`);
for (const finding of errors) console.error(`ERROR ${finding.message}`);

console.log(
  `\ncheck-no-private-deps (--mode=${mode}): ${publishableCount} publishable packages checked — ${errors.length} error(s), ${warnings.length} warning(s), ${inventory.length} unpublished (inventory)`,
);

if (errors.length > 0) {
  console.error(
    "\nPublished packages must not depend on private/unpublished workspace packages (see #599).",
  );
  process.exit(1);
}
