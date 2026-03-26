#!/usr/bin/env bun
/**
 * publish-status.ts
 *
 * Compares local workspace package versions against the npm registry.
 * Reports whether each package is published, outdated, new, or private.
 *
 * Usage: bun scripts/publish-status.ts
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const patterns: string[] = rootPkg.workspaces ?? [];

// -------------------------------------------------------------------
// Collect workspace packages via Bun.Glob
// -------------------------------------------------------------------

interface PackageMeta {
  name: string;
  version: string;
  private: boolean;
}

const packages: PackageMeta[] = [];

for (const pattern of patterns) {
  const parentGlob = new Bun.Glob(pattern);
  for (const match of parentGlob.scanSync({ cwd: root, onlyFiles: false })) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, match, "package.json"), "utf8"));
      if (pkg.name) {
        packages.push({ name: pkg.name, version: pkg.version, private: pkg.private === true });
      }
    } catch {
      // Not a package directory
    }
  }
}

packages.sort((a, b) => a.name.localeCompare(b.name));

// -------------------------------------------------------------------
// Output
// -------------------------------------------------------------------

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const DIM    = "\x1b[2m";
const CYAN   = "\x1b[36m";

const col = (str: string, width: number): string => str.padEnd(width);

const NAME_W   = 52;
const LOCAL_W  = 10;
const STATUS_W = 12;
const NPM_W    = 12;

const header = [
  BOLD + col("Package", NAME_W),
  col("Local", LOCAL_W),
  col("Status", STATUS_W),
  col("npm", NPM_W) + RESET,
].join("  ");

const divider = "─".repeat(NAME_W + LOCAL_W + STATUS_W + NPM_W + 6);

console.log(`\n${header}`);
console.log(divider);

let publishedCount = 0;
let outdatedCount = 0;
let newCount = 0;
let privateCount = 0;

// Query npm registry in parallel for all public packages
const publicPackages = packages.filter((p) => !p.private);
const registryVersions = await Promise.all(
  publicPackages.map(async (pkg) => {
    try {
      const proc = Bun.spawn(["npm", "view", pkg.name, "version", "--json", "--prefer-online"], {
        stdout: "pipe",
        stderr: "ignore",
      });
      const output = await new Response(proc.stdout).text();
      const code = await proc.exited;
      if (code !== 0) return null;
      return JSON.parse(output.trim()) as string;
    } catch {
      return null;
    }
  }),
);

const registryMap = new Map<string, string | null>();
publicPackages.forEach((pkg, i) => registryMap.set(pkg.name, registryVersions[i]));

for (const pkg of packages) {
  if (pkg.private) {
    privateCount++;
    console.log(
      [
        DIM + col(pkg.name, NAME_W),
        col(pkg.version ?? "—", LOCAL_W),
        col("private", STATUS_W),
        col("—", NPM_W) + RESET,
      ].join("  "),
    );
    continue;
  }

  const registryVersion = registryMap.get(pkg.name) ?? null;
  let statusLabel: string;

  if (!registryVersion) {
    newCount++;
    statusLabel = RED + col("new", STATUS_W) + RESET;
  } else if (registryVersion === pkg.version) {
    publishedCount++;
    statusLabel = GREEN + col("published", STATUS_W) + RESET;
  } else {
    outdatedCount++;
    statusLabel = YELLOW + col("outdated", STATUS_W) + RESET;
  }

  console.log(
    [
      col(pkg.name, NAME_W),
      col(pkg.version ?? "—", LOCAL_W),
      statusLabel,
      CYAN + col(registryVersion ?? "—", NPM_W) + RESET,
    ].join("  "),
  );
}

console.log(divider);
console.log(
  `\n${BOLD}${packages.length} packages${RESET}  ` +
  `${GREEN}${publishedCount} published${RESET}  ` +
  `${YELLOW}${outdatedCount} outdated${RESET}  ` +
  `${RED}${newCount} new${RESET}  ` +
  `${DIM}${privateCount} private${RESET}\n`,
);
