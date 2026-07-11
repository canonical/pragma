#!/usr/bin/env bun
/**
 * check-no-private-deps.ts — static consumer-installability guard.
 *
 * For every publishable workspace package (private !== true), asserts that
 * none of its production dependencies (dependencies, peerDependencies,
 * optionalDependencies) would break an external `npm install` of the
 * published package:
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
 *
 * Usage:
 *   bun scripts/consumer-smoke/check-no-private-deps.ts [--mode=pr|publish]
 *
 * Exits non-zero if any ERROR is found.
 */

import {
  getPublishablePackages,
  getWorkspacePackages,
  type WorkspacePackage,
} from "./workspace.ts";

const REGISTRY = process.env.NPM_REGISTRY_URL ?? "https://registry.npmjs.org";
const BAD_PROTOCOLS = /^(workspace|file|link|portal):/;
const PROD_DEP_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = modeArg ? modeArg.slice("--mode=".length) : "pr";
if (mode !== "pr" && mode !== "publish") {
  console.error(`Unknown --mode=${mode}; expected "pr" or "publish".`);
  process.exit(2);
}

const workspaceByName = new Map<string, WorkspacePackage>(
  getWorkspacePackages().map((pkg) => [pkg.name, pkg]),
);
const publishable = getPublishablePackages();

/** Published versions per package name, or null when the registry has no such package. */
const registryCache = new Map<string, string[] | null>();

async function publishedVersions(name: string): Promise<string[] | null> {
  const cached = registryCache.get(name);
  if (cached !== undefined) return cached;
  let result: string[] | null = null;
  try {
    const res = await fetch(`${REGISTRY}/${encodeURIComponent(name)}`, {
      headers: { accept: "application/vnd.npm.install-v1+json" },
    });
    if (res.status === 404) {
      result = null;
    } else if (res.ok) {
      const data = (await res.json()) as { versions?: Record<string, unknown> };
      result = Object.keys(data.versions ?? {});
    } else {
      throw new Error(`registry returned ${res.status}`);
    }
  } catch (error) {
    // Treat registry outages as "unknown", not as failures of this repo.
    console.warn(`WARN  could not query registry for ${name}: ${error}`);
    result = [];
  }
  registryCache.set(name, result);
  return result;
}

interface Finding {
  level: "error" | "warn";
  message: string;
}

const findings: Finding[] = [];

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

      const versions = await publishedVersions(depName);
      if (versions === null) {
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
        versions.length > 0 &&
        !versions.some((version) => Bun.semver.satisfies(version, spec))
      ) {
        findings.push({
          level: "warn",
          message: `${context}: no published version of ${depName} satisfies "${spec}" (latest published set: ${versions.slice(-3).join(", ")}) — expected only between a version bump and its publish`,
        });
      }
    }
  }
}

const errors = findings.filter((finding) => finding.level === "error");
const warnings = findings.filter((finding) => finding.level === "warn");

for (const finding of warnings) console.warn(`WARN  ${finding.message}`);
for (const finding of errors) console.error(`ERROR ${finding.message}`);

console.log(
  `\ncheck-no-private-deps (--mode=${mode}): ${publishable.length} publishable packages checked — ${errors.length} error(s), ${warnings.length} warning(s)`,
);

if (errors.length > 0) {
  console.error(
    "\nPublished packages must not depend on private/unpublished workspace packages (see #599).",
  );
  process.exit(1);
}
