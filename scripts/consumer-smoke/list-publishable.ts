#!/usr/bin/env bun
/**
 * Prints the names of all publishable workspace packages, comma-separated,
 * for use as an Nx `--projects` filter (Nx project names match package
 * names in this repo):
 *
 *   bunx nx run-many -t build --projects="$(bun scripts/consumer-smoke/list-publishable.ts)"
 *
 * Pass `--lines` for one name per line (human inspection).
 */

import { getPublishablePackages } from "./workspace.ts";

const names = getPublishablePackages().map((pkg) => pkg.name);

if (process.argv.includes("--lines")) {
  console.log(names.join("\n"));
} else {
  console.log(names.join(","));
}
