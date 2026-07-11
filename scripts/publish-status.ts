#!/usr/bin/env bun
/**
 * publish-status.ts
 *
 * Compares local workspace package versions against the npm registry.
 * Reports whether each package is published, outdated, new, or private, and
 * whether the latest published version carries an npm provenance attestation
 * (i.e. was published via OIDC trusted publishing with `--provenance`).
 *
 * All data comes from the shared registry-status client in
 * @canonical/consumer-smoke (packages/consumer-smoke) — one `npm view
 * <pkg> --json` per package, run as parallel @canonical/task effects, no
 * login required. This script is only the table renderer; do not grow a
 * second registry client here.
 *
 * Note: npm exposes no public API for whether a *trusted publisher* is
 * configured on a package; provenance on the latest version is the closest
 * public, scriptable signal that OIDC publishing is actually in effect.
 *
 * Usage: bun scripts/publish-status.ts
 */

// Relative import (not the bare "@canonical/consumer-smoke" specifier):
// this repo links workspace deps per-package, and the root has no dependency
// on the tool package, so bare resolution is not available from scripts/.
import {
  fetchRegistryStatuses,
  getWorkspacePackages,
  type RegistryStatus,
} from "../packages/consumer-smoke/src/index.ts";

const packages = getWorkspacePackages();

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
let unknownCount = 0;
let provenanceCount = 0;

// One parallel, deduplicated batch for every public package.
const publicPackages = packages.filter((pkg) => !pkg.private);
const statuses = await fetchRegistryStatuses(
  publicPackages.map((pkg) => pkg.name),
);

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

  const status: RegistryStatus = statuses.get(pkg.name) ?? {
    state: "unknown",
    reason: "no lookup performed",
  };
  const registryVersion = status.state === "published" ? status.latest : null;
  let statusLabel: string;

  if (status.state === "unknown") {
    unknownCount++;
    statusLabel = YELLOW + col("unknown", STATUS_W) + RESET;
  } else if (status.state === "absent") {
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
  if (status.state !== "published" || !registryVersion) {
    provLabel = DIM + col("—", PROV_W) + RESET;
  } else if (status.hasProvenance) {
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
  (unknownCount > 0 ? `${YELLOW}${unknownCount} unknown${RESET}  ` : "") +
  `${GREEN}${provenanceCount} with provenance${RESET}\n`,
);
