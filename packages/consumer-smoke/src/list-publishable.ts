#!/usr/bin/env bun
/**
 * Prints the names of all publishable workspace packages, comma-separated,
 * for use as an Nx `--projects` filter (Nx project names match package
 * names in this repo):
 *
 *   bunx nx run-many -t build --projects="$(bun packages/consumer-smoke/src/list-publishable.ts)"
 *
 * Pass `--lines` for one name per line (human inspection).
 *
 * NOTE: this runs BEFORE the workspace is built, so it must not import
 * anything that needs a built package (e.g. @canonical/task).
 */

import { getPublishablePackages } from "./workspace.js";

const names = getPublishablePackages().map((pkg) => pkg.name);

if (process.argv.includes("--lines")) {
  console.log(names.join("\n"));
} else {
  console.log(names.join(","));
}
