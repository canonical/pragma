#!/usr/bin/env bun
/**
 * check-internal-ranges.ts
 *
 * Guards three workspace-integrity invariants that `lerna version` does not
 * maintain on its own:
 *
 * 1. Link integrity — every dependencies/devDependencies/optionalDependencies
 *    range targeting a workspace package must be satisfied by that package's
 *    workspace version. Otherwise Bun silently installs a stale copy from the
 *    npm registry instead of linking the workspace.
 *
 * 2. Peer satisfiability — every peerDependencies range targeting a workspace
 *    package must be satisfied by that package's current version. Lerna
 *    rewrites dependency ranges on `lerna version` but never peerDependencies,
 *    so peers drift on every release; prerelease versions (such as
 *    "-experimental" builds) then satisfy none of the stale ranges and
 *    external `npm install` consumers hit unmet-peer errors.
 *
 * 3. Lock integrity — no workspace package may be resolved from the npm
 *    registry anywhere in bun.lock.
 *
 * Usage: bun scripts/check-internal-ranges.ts
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const patterns: string[] = rootPkg.workspaces ?? [];

interface WorkspacePackage {
  name: string;
  version: string;
  relPath: string;
  manifest: Record<string, Record<string, string> | undefined>;
}

// -------------------------------------------------------------------
// Collect workspace packages via Bun.Glob
// -------------------------------------------------------------------
const workspaces = new Map<string, WorkspacePackage>();
for (const pattern of patterns) {
  const glob = new Bun.Glob(`${pattern}/package.json`);
  for (const match of glob.scanSync({ cwd: root })) {
    const manifest = JSON.parse(readFileSync(join(root, match), "utf8"));
    if (manifest.name) {
      workspaces.set(manifest.name, {
        name: manifest.name,
        version: manifest.version,
        relPath: match,
        manifest,
      });
    }
  }
}

const failures: string[] = [];

// -------------------------------------------------------------------
// 1 + 2: range satisfiability for edges that target workspace packages
// -------------------------------------------------------------------
const sections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

for (const pkg of workspaces.values()) {
  for (const section of sections) {
    for (const [target, range] of Object.entries(
      pkg.manifest[section] ?? {},
    )) {
      const targetPkg = workspaces.get(target);
      if (!targetPkg || range.startsWith("workspace:")) {
        continue;
      }
      if (!Bun.semver.satisfies(targetPkg.version, range)) {
        const consequence =
          section === "peerDependencies"
            ? "external installs hit an unmet peer"
            : "Bun resolves it from the npm registry instead of the workspace";
        failures.push(
          `${pkg.relPath}: ${section}["${target}"] = "${range}" does not match the workspace version ${targetPkg.version} — ${consequence}`,
        );
      }
    }
  }
}

// -------------------------------------------------------------------
// 3: no workspace package resolved from the npm registry in bun.lock
// -------------------------------------------------------------------
const lock = readFileSync(join(root, "bun.lock"), "utf8");
for (const name of workspaces.keys()) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const registryResolution = new RegExp(`"${escaped}@(?!workspace:)([^"]+)"`);
  const match = lock.match(registryResolution);
  if (match) {
    failures.push(
      `bun.lock: ${name} is resolved from the npm registry at ${match[1]} instead of the workspace — fix the offending range and re-run \`bun install\``,
    );
  }
}

// -------------------------------------------------------------------
// Report
// -------------------------------------------------------------------
if (failures.length > 0) {
  console.error(
    `check-internal-ranges: ${failures.length} violation(s) found\n`,
  );
  for (const failure of failures) {
    console.error(`  ✗ ${failure}`);
  }
  process.exit(1);
}

console.log(
  `check-internal-ranges: ${workspaces.size} workspace packages checked, all internal ranges consistent`,
);
