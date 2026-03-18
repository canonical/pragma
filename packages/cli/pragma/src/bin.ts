#!/usr/bin/env bun

import { runCli } from "./lib/runCli.js";
import { detectLocalInstall } from "./pm.js";

const localWarning = detectLocalInstall();
if (localWarning) {
  console.warn(localWarning);
}

await runCli(process.argv);
