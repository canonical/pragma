/**
 * Build script for the pragma CLI compiled binary.
 *
 * Uses `Bun.build()` to compile the CLI into a standalone executable,
 * embedding all non-JS assets that the binary needs at runtime:
 * - TTL graph files from semantic packages (definitions + data)
 * - Skill markdown files from semantic packages
 * - Story-pack JSON files from semantic packages (`stories/*.json`,
 *   forced to file assets by the story-assets plugin so they surface
 *   in `Bun.embeddedFiles` instead of compiling into JSON modules)
 * - Package.json files for version detection
 * - EJS templates from summon packages (component/package generators)
 *
 * Assets are discovered dynamically via glob — no hardcoded file lists.
 */

import { Glob } from "bun";
import createStoryAssetsPlugin from "../src/domains/shared/loaders/storyAssetsPlugin.js";

// ---------------------------------------------------------------------------
// Asset discovery
// ---------------------------------------------------------------------------

/** Glob patterns for files to embed from node_modules. */
const EMBED_PATTERNS = [
  // Semantic graph packages — TTL definitions, data, skills, stories,
  // and package.json
  "node_modules/@canonical/design-system/definitions/**/*.ttl",
  "node_modules/@canonical/design-system/data/**/*.ttl",
  "node_modules/@canonical/design-system/skills/**/*.md",
  "node_modules/@canonical/design-system/stories/*.json",
  "node_modules/@canonical/design-system/package.json",
  "node_modules/@canonical/code-standards/definitions/**/*.ttl",
  "node_modules/@canonical/code-standards/data/**/*.ttl",
  "node_modules/@canonical/code-standards/skills/**/*.md",
  "node_modules/@canonical/code-standards/stories/*.json",
  "node_modules/@canonical/code-standards/package.json",
  "node_modules/@canonical/anatomy-dsl/definitions/**/*.ttl",
  "node_modules/@canonical/anatomy-dsl/stories/*.json",
  "node_modules/@canonical/anatomy-dsl/package.json",
  // Summon templates — EJS files for component/package generators
  "node_modules/@canonical/summon-component/src/templates/**/*.ejs",
  "node_modules/@canonical/summon-package/src/templates/**/*.ejs",
];

function discoverAssets(): string[] {
  const assets: string[] = [];
  for (const pattern of EMBED_PATTERNS) {
    const glob = new Glob(pattern);
    for (const path of glob.scanSync({ cwd: ".", followSymlinks: true })) {
      assets.push(path);
    }
  }
  return assets;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const assets = discoverAssets();
console.log(`Embedding ${assets.length} assets`);

const result = await Bun.build({
  entrypoints: ["src/bin.ts", ...assets],
  minify: true,
  plugins: [createStoryAssetsPlugin()],
  compile: {
    target: "bun-linux-x64",
    outfile: "dist/pragma",
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Built dist/pragma (${assets.length} embedded assets)`);
