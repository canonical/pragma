#!/usr/bin/env bun

import { detectLocalInstall } from "./package-manager/index.js";
import runCli from "./pipeline/runCli.js";

const localWarning = detectLocalInstall();
if (localWarning) {
  console.warn(localWarning);
}

await runCli(process.argv);
