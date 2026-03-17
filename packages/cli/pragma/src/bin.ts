#!/usr/bin/env bun

import { detectLocalInstall } from "./pm.js";

const localWarning = detectLocalInstall();
if (localWarning) {
  console.warn(localWarning);
}

console.log("pragma — not yet implemented");
