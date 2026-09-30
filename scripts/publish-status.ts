#!/usr/bin/env bun
/**
 * publish-status.ts
 *
 * Compares local workspace package versions against the npm registry.
 * Reports whether each package is published, outdated, new, or private, and
 * whether the latest published version carries an npm provenance attestation
 * (i.e. was published via OIDC trusted publishing with `--provenance`).
 *
 * All data comes from the public registry (`npm view`), so no login is required.
 * Note: npm exposes no public API for whether a *trusted publisher* is
 * configured on a package; provenance on the latest version is the closest
 * public, scriptable signal that OIDC publishing is actually in effect.
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
const PROV_W   = 14;

const header = [
  BOLD + col("Package", NAME_W),
  col("Local", LOCAL_W),
  col("Status", STATUS_W),
  col("npm", NPM_W),
  col("Provenance", PROV_W) + RESET,
].join("  ");

const divider = "─".repeat(
  NAME_W + LOCAL_W + STATUS_W + NPM_W + PROV_W + 8,
);

console.log(`\n${header}`);
console.log(divider);

let publishedCount = 0;
let outdatedCount = 0;
let newCount = 0;
let privateCount = 0;
let provenanceCount = 0;

// What the public registry reports for a package's latest version.
interface RegistryInfo {
  version: string | null;
  /** True when the latest version carries an npm provenance attestation. */
  hasProvenance: boolean;
}

// Query npm registry in parallel for all public packages. A single `npm view
// <pkg> --json` returns both the version and `dist.attestations` (provenance).
const publicPackages = packages.filter((p) => !p.private);
const registryInfos = await Promise.all(
  publicPackages.map(async (pkg): Promise<RegistryInfo> => {
    try {
      const proc = Bun.spawn(
        ["npm", "view", pkg.name, "--json", "--prefer-online"],
        { stdout: "pipe", stderr: "ignore" },
      );
      const output = await new Response(proc.stdout).text();
      const code = await proc.exited;
      if (code !== 0) return { version: null, hasProvenance: false };
      const data = JSON.parse(output.trim());
      // For a published package, `npm view --json` returns the latest version's
      // manifest. `dist.attestations.provenance` is present only when the
      // version was published with OIDC `--provenance`.
      const version = typeof data?.version === "string" ? data.version : null;
      const hasProvenance = Boolean(data?.dist?.attestations?.provenance);
      return { version, hasProvenance };
    } catch {
      return { version: null, hasProvenance: false };
    }
  }),
);

const registryMap = new Map<string, RegistryInfo>();
publicPackages.forEach((pkg, i) => {
  registryMap.set(pkg.name, registryInfos[i]);
});

for (const pkg of packages) {
  if (pkg.private) {
    privateCount++;
    console.log(
      [
        DIM + col(pkg.name, NAME_W),
        col(pkg.version ?? "—", LOCAL_W),
        col("private", STATUS_W),
        col("—", NPM_W),
        col("—", PROV_W) + RESET,
      ].join("  "),
    );
    continue;
  }

  const info = registryMap.get(pkg.name) ?? {
    version: null,
    hasProvenance: false,
  };
  const registryVersion = info.version;
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

  // Provenance is only meaningful for an actually-published version.
  let provLabel: string;
  if (!registryVersion) {
    provLabel = DIM + col("—", PROV_W) + RESET;
  } else if (info.hasProvenance) {
    provenanceCount++;
    provLabel = GREEN + col("provenance ✓", PROV_W) + RESET;
  } else {
    provLabel = YELLOW + col("none", PROV_W) + RESET;
  }

  console.log(
    [
      col(pkg.name, NAME_W),
      col(pkg.version ?? "—", LOCAL_W),
      statusLabel,
      CYAN + col(registryVersion ?? "—", NPM_W) + RESET,
      provLabel,
    ].join("  "),
  );
}

console.log(divider);
console.log(
  `\n${BOLD}${packages.length} packages${RESET}  ` +
  `${GREEN}${publishedCount} published${RESET}  ` +
  `${YELLOW}${outdatedCount} outdated${RESET}  ` +
  `${RED}${newCount} new${RESET}  ` +
  `${DIM}${privateCount} private${RESET}  ` +
  `${GREEN}${provenanceCount} with provenance${RESET}\n`,
);
