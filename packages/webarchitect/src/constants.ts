import { existsSync } from "node:fs";
import { join } from "node:path";

// Handle both source (src/) and built (dist/esm/) paths
const srcPath = join(import.meta.dirname, "../rulesets");
const distPath = join(import.meta.dirname, "../../rulesets");

/* v8 ignore next -- distPath branch only taken from compiled dist/ */
export const BUNDLED_RULESETS_DIR = existsSync(srcPath) ? srcPath : distPath;
