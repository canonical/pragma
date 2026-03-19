#!/usr/bin/env bun
/**
 * check-publish-status.ts
 *
 * Lists all workspace packages and checks whether each is published on npm.
 * Outputs: package name | local version | published? | latest npm version
 *
 * Usage: bun scripts/check-publish-status.ts
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// -------------------------------------------------------------------
// Collect all workspace package.json paths
// -------------------------------------------------------------------

const rootPkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const workspaceGlobs: string[] = rootPkg.workspaces ?? [];

const packageJsonPaths: string[] = [];
for (const pattern of workspaceGlobs) {
  const parts = pattern.split("/");
  const baseDir = resolve(ROOT, ...parts.slice(0, -1));
  const last = parts[parts.length - 1];
  if (last === "*") {
    let entries: string[] = [];
    try { entries = readdirSync(baseDir); } catch { continue; }
    for (const entry of entries) {
      const pkgJson = resolve(baseDir, entry, "package.json");
      if (existsSync(pkgJson)) packageJsonPaths.push(pkgJson);
    }
  } else {
    const pkgJson = resolve(ROOT, pattern, "package.json");
    if (existsSync(pkgJson)) packageJsonPaths.push(pkgJson);
  }
}

// -------------------------------------------------------------------
// Read local package metadata
// -------------------------------------------------------------------

interface PackageMeta {
  name: string;
  version: string;
  private: boolean;
}

const packages: PackageMeta[] = packageJsonPaths
  .map((p) => {
    const pkg = JSON.parse(readFileSync(p, "utf8"));
    return { name: pkg.name, version: pkg.version, private: pkg.private === true };
  })
  .filter((p) => p.name)
  .sort((a, b) => a.name.localeCompare(b.name));

// -------------------------------------------------------------------
// Query npm for each package
// -------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const DIM   = "\x1b[2m";
const CYAN  = "\x1b[36m";

const col = (str: string, width: number): string => str.padEnd(width);

const NAME_W   = 52;
const LOCAL_W  = 10;
const STATUS_W = 12;
const LATEST_W = 12;

const header = [
  BOLD + col("Package", NAME_W),
  col("Local", LOCAL_W),
  col("Published?", STATUS_W),
  col("Latest on npm", LATEST_W) + RESET,
].join("  ");

const divider = "─".repeat(NAME_W + LOCAL_W + STATUS_W + LATEST_W + 6);

console.log(`\n${header}`);
console.log(divider);

let published = 0;
let unpublished = 0;
let privateCount = 0;

for (const pkg of packages) {
  if (pkg.private) {
    privateCount++;
    console.log(
      [
        DIM + col(pkg.name, NAME_W),
        col(pkg.version ?? "—", LOCAL_W),
        col("private", STATUS_W),
        col("—", LATEST_W) + RESET,
      ].join("  "),
    );
    continue;
  }

  let latestVersion: string | null = null;
  let isPublished = false;

  try {
    const result = execSync(`npm view ${pkg.name} version --json 2>/dev/null`, {
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
    latestVersion = JSON.parse(result);
    isPublished = true;
    published++;
  } catch {
    isPublished = false;
    unpublished++;
  }

  const statusLabel = isPublished
    ? GREEN + col("yes", STATUS_W) + RESET
    : RED   + col("no", STATUS_W)  + RESET;

  console.log(
    [
      col(pkg.name, NAME_W),
      col(pkg.version ?? "—", LOCAL_W),
      statusLabel,
      CYAN + col(latestVersion ?? "—", LATEST_W) + RESET,
    ].join("  "),
  );
}

console.log(divider);
console.log(
  `\n${BOLD}${packages.length} packages${RESET}  ` +
  `${GREEN}${published} published${RESET}  ` +
  `${RED}${unpublished} unpublished${RESET}  ` +
  `${DIM}${privateCount} private${RESET}\n`,
);
