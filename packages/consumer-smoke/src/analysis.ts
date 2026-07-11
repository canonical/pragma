/**
 * Pure analysis for the consumer-installability guard: given the workspace
 * packages and a map of registry statuses, produce
 *
 *   1. dependency-edge findings — a PUBLISHED package whose production deps
 *      would break an external `npm install` (the #599 failure class), and
 *   2. the release-readiness inventory — EVERY publishable package that has
 *      never been published to npm, whether or not anything depends on it.
 *
 * No I/O here: workspace enumeration lives in workspace.ts, registry lookups
 * in registry.ts, printing in check-no-private-deps.ts. That keeps this fully
 * unit-testable with fabricated fixtures.
 */

import semver from "semver";
import type { RegistryStatus } from "./registry.js";
import type { WorkspacePackage } from "./workspace.js";

export type CheckMode = "pr" | "publish";

export interface Finding {
  level: "error" | "warn";
  message: string;
}

export interface InventoryEntry {
  name: string;
  relDir: string;
  version: string;
  /** "never-published" = definitive E404; "unknown" = registry unreachable (fail-closed). */
  status: "never-published" | "unknown";
  reason?: string;
}

export interface Analysis {
  /** Dependency-edge findings (hard errors keep existing --mode semantics). */
  findings: Finding[];
  /** Every publishable package with no published version (plus unknowns). */
  inventory: InventoryEntry[];
  publishableCount: number;
}

const BAD_PROTOCOLS = /^(workspace|file|link|portal):/;
const PROD_DEP_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

/**
 * Every registry lookup the guard needs, deduplicated: each publishable
 * package's own name (for the inventory) plus every publishable workspace
 * package appearing as a production dependency of a publishable package
 * (for the edge check). Private workspace deps need no lookup — they are
 * errors unconditionally.
 */
export function collectRegistryLookups(packages: WorkspacePackage[]): string[] {
  const workspaceByName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const names = new Set<string>();
  for (const pkg of packages) {
    if (pkg.private) continue;
    names.add(pkg.name);
    for (const field of PROD_DEP_FIELDS) {
      const deps = (pkg.manifest[field] ?? {}) as Record<string, string>;
      for (const depName of Object.keys(deps)) {
        const dep = workspaceByName.get(depName);
        if (dep && !dep.private) names.add(depName);
      }
    }
  }
  return [...names].sort();
}

export interface AnalyzeInput {
  packages: WorkspacePackage[];
  statuses: ReadonlyMap<string, RegistryStatus>;
  mode: CheckMode;
}

export function analyze({ packages, statuses, mode }: AnalyzeInput): Analysis {
  const workspaceByName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const publishable = packages.filter((pkg) => !pkg.private);
  const findings: Finding[] = [];

  // ---- 1. Dependency-edge guard (existing semantics, plus fail-closed) ----
  for (const pkg of publishable) {
    for (const field of PROD_DEP_FIELDS) {
      const deps = (pkg.manifest[field] ?? {}) as Record<string, string>;
      for (const [depName, spec] of Object.entries(deps)) {
        const context = `${pkg.name} (${pkg.relDir}) → ${field}.${depName}@"${spec}"`;

        if (BAD_PROTOCOLS.test(spec)) {
          findings.push({
            level: "error",
            message: `${context}: "${spec.split(":")[0]}:" protocol does not resolve outside this monorepo`,
          });
          continue;
        }

        const workspaceDep = workspaceByName.get(depName);
        if (!workspaceDep) continue; // Regular registry dependency

        if (workspaceDep.private) {
          findings.push({
            level: "error",
            message: `${context}: depends on PRIVATE workspace package ${depName} (${workspaceDep.relDir}) which is never published to npm`,
          });
          continue;
        }

        const status = statuses.get(depName);
        if (status === undefined || status.state === "unknown") {
          // Fail closed: a rate-limited/unreachable registry must not make
          // an unpublished dependency look published.
          const reason =
            status?.state === "unknown" ? status.reason : "no lookup performed";
          findings.push({
            level: mode === "publish" ? "error" : "warn",
            message: `${context}: could not determine publication status of ${depName} (${reason}) — failing closed${mode === "publish" ? "; refusing to gate a publish on unknown registry state" : ""}`,
          });
          continue;
        }

        if (status.state === "absent") {
          const message = `${context}: workspace package ${depName} has never been published to npm — an external \`npm install ${pkg.name}\` fails today`;
          if (mode === "publish") {
            findings.push({
              level: "warn",
              message: `${message} (publish mode: \`lerna publish from-package\` publishes it in this run)`,
            });
          } else {
            findings.push({ level: "error", message });
          }
          continue;
        }

        if (
          status.versions.length > 0 &&
          semver.validRange(spec) !== null &&
          !status.versions.some((version) => semver.satisfies(version, spec))
        ) {
          findings.push({
            level: "warn",
            message: `${context}: no published version of ${depName} satisfies "${spec}" (latest published set: ${status.versions.slice(-3).join(", ")}) — expected only between a version bump and its publish`,
          });
        }
      }
    }
  }

  // ---- 2. Release-readiness inventory: every never-published package ------
  const inventory: InventoryEntry[] = [];
  for (const pkg of publishable) {
    const status = statuses.get(pkg.name);
    if (status === undefined || status.state === "unknown") {
      const reason =
        status?.state === "unknown" ? status.reason : "no lookup performed";
      inventory.push({
        name: pkg.name,
        relDir: pkg.relDir,
        version: pkg.version,
        status: "unknown",
        reason,
      });
      // Fail closed here too: in publish mode an undeterminable package
      // blocks; in pr mode it surfaces as a warning.
      findings.push({
        level: mode === "publish" ? "error" : "warn",
        message: `${pkg.name} (${pkg.relDir}): could not determine publication status (${reason}) — failing closed`,
      });
    } else if (status.state === "absent") {
      inventory.push({
        name: pkg.name,
        relDir: pkg.relDir,
        version: pkg.version,
        status: "never-published",
      });
    }
  }

  inventory.sort((a, b) => a.name.localeCompare(b.name));
  return { findings, inventory, publishableCount: publishable.length };
}
