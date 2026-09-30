#!/usr/bin/env bun
/**
 * Validates that the implementation graph data this package ships is
 * well-formed Turtle. Runs against the canonical monorepo root data/
 * directory (the prepack snapshot source).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Parser } from "n3";
import { glob } from "tinyglobby";

const dataDir = join(import.meta.dir, "..", "..", "..", "..", "data");
const files = await glob("**/*.ttl", { cwd: dataDir, absolute: true });

if (files.length === 0) {
	console.error(`No .ttl files found in ${dataDir} — run \`bun run collect\` from the repo root.`);
	process.exit(1);
}

let quads = 0;
let failed = false;
for (const file of files.sort()) {
	try {
		quads += new Parser().parse(await readFile(file, "utf-8")).length;
	} catch (error) {
		console.error(`FAIL ${file}: ${(error as Error).message}`);
		failed = true;
	}
}

if (failed) process.exit(1);
console.log(`OK: ${files.length} file(s), ${quads} quad(s)`);
