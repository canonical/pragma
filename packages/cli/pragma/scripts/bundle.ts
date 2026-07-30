/**
 * Compile the embedded pack from `pragma.conf.ts`.
 *
 * Resolves the distribution's own declared packs through the PRODUCT's pipeline
 * (`parsePackDeclaration` → `resolvePackage` → `buildPack`, with `sources
 * update`'s own prefix precedence) into a throwaway cache, then inlines the four
 * artifacts as escaped JS strings. Inlining (rather than shipping file assets)
 * is what lets the pack survive `bun build --compile` with no asset step, so a
 * cold install answers store-backed reads offline.
 *
 * NOT byte-reproducible, and deliberately does not try to be: `data.nq`'s blank
 * node labels and `schema.json`'s SHACL value order are store-order artifacts.
 * Instead the script writes NOTHING when the pack's identity — its
 * `contentHash`, a SHA-256 over the sorted TTL inputs — matches the committed
 * manifest. Re-running against unchanged upstream sources therefore produces a
 * zero diff, which is strictly stronger than byte-reproducibility. The one thing
 * skip-on-equal-hash cannot see is a TOOLCHAIN change with unchanged sources;
 * that is caught rather than silent (`probe.test.ts` and `wasmEmbed.test.ts`
 * both boot the committed embed on every test run), and deleting
 * `pack.generated.ts` forces a full regeneration.
 *
 * Needs the network (a shallow clone per git pack). Run deliberately by a
 * maintainer — `bun run bundle` — never by CI or `bun run build`: the artifacts
 * are committed.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPackPrefixes } from "../src/capabilities/sources/runUpdate.js";
import { VERSION } from "../src/constants.js";
import defaults from "../src/kernel/config/defaults.js";
import type { PackDeclaration } from "../src/kernel/config/types.js";
import { buildPack } from "../src/kernel/runtime/graphpack/build.js";
import {
  DATA_FILE,
  INDEX_FILE,
  MANIFEST_FILE,
  SCHEMA_FILE,
} from "../src/kernel/runtime/graphpack/types.js";
import { parsePackDeclaration } from "../src/kernel/runtime/refs/parseRef.js";
import {
  detectPrefixClashes,
  resolvePackage,
} from "../src/kernel/runtime/refs/resolve.js";

/**
 * Build-environment source overrides: a declared pack whose source is not
 * reachable from the machine that compiles the embed.
 *
 * `@canonical/anatomy-dsl` is unreachable here; the published npm package ships
 * the SAME `definitions/ontology.ttl` + `definitions/shapes.ttl`. The override
 * resolves it from `node_modules` (pinned in devDependencies) and the manifest's
 * `sourceRef` records `npm:<version>` rather than `git:<sha>`, so the artifact
 * never claims a provenance it does not have. `pragma.conf.ts` keeps its git
 * source, which is the correct ref for real users — a compiled binary carries no
 * `node_modules`. Delete the entry once the remote is reachable from the build.
 */
const SOURCE_OVERRIDES: Readonly<Record<string, PackDeclaration>> = {
  "@canonical/anatomy-dsl": { name: "@canonical/anatomy-dsl" }, // no `source` ⇒ npm
};

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const embeddedDir = join(packageRoot, "src/kernel/runtime/graphpack/embedded");
const outPath = join(embeddedDir, "pack.generated.ts");
// The index string lives in its OWN module so the storeless `__complete` path
// (entitySource) imports only it — never the n-quads/schema/manifest strings.
const indexOutPath = join(embeddedDir, "pack.index.generated.ts");

const entryName = (entry: PackDeclaration): string =>
  typeof entry === "string" ? entry : entry.name;

/** The committed embed's content hash, or `undefined` when there is none. */
async function readCommittedHash(): Promise<string | undefined> {
  try {
    const { manifestJson } = await import(
      "../src/kernel/runtime/graphpack/embedded/pack.generated.js"
    );
    return (JSON.parse(manifestJson) as { contentHash: string }).contentHash;
  } catch {
    // No committed embed (or it is unreadable) — regenerate from scratch.
    return undefined;
  }
}

// Build into an isolated cache so the developer's real cache is untouched and
// every run re-resolves its refs rather than reusing a stale checkout.
const cacheHome = mkdtempSync(join(tmpdir(), "pragma-bundle-"));
process.env.XDG_CACHE_HOME = cacheHome;

try {
  const declared = defaults.packs ?? [];
  const resolved = [];
  for (const entry of declared) {
    const ref = parsePackDeclaration(
      SOURCE_OVERRIDES[entryName(entry)] ?? entry,
    );
    // A local path in the committed artifact would pin the build machine's
    // filesystem into the shipped provenance — and would embed whatever happened
    // to be in a developer's checkout.
    if (ref.kind === "file") {
      throw new Error(
        `Pack "${ref.pkg}" resolves from a local path — a file: ref would put a machine-specific path in the committed artifact.`,
      );
    }
    console.log(`Resolving ${ref.pkg} (${ref.kind})`);
    const pkg = await resolvePackage(ref, { cwd: packageRoot });
    resolved.push({ kind: ref.kind, ...pkg });
  }

  const inputs = resolved.flatMap((pkg) => pkg.sources);
  if (inputs.length === 0) {
    throw new Error(
      `The ${declared.length} declared pack(s) resolved 0 RDF sources — refusing to embed an empty graph.`,
    );
  }

  // The SAME precedence a user's `sources update` applies, so the embed cannot
  // compact entity names differently from what this config builds elsewhere.
  const prefixes = buildPackPrefixes(inputs, defaults.prefixes);
  for (const clash of detectPrefixClashes(inputs)) {
    console.warn(
      `Prefix "${clash.label}:" is declared with conflicting IRIs (${clash.iris.join(" vs ")}); the config pin decides which wins.`,
    );
  }

  // `<name>@<kind>:<resolved>` — the resolved revisions, in the manifest field
  // whose contract is already "the config ref verbatim, or a label". Nothing
  // machine-specific can appear: git resolves to a SHA, npm to a version, and a
  // file: ref was refused above. It also makes the npm substitution legible.
  const sourceRef = resolved
    .map((pkg) => `${pkg.name}@${pkg.kind}:${pkg.resolved}`)
    .join(", ");

  const built = await buildPack(inputs, {
    name: "pragma",
    version: VERSION,
    sourceRef,
    prefixes,
  });
  if (built.manifest.tripleCount === 0) {
    throw new Error(
      "The declared packs parsed to 0 RDF triples — refusing to embed an empty graph.",
    );
  }

  if ((await readCommittedHash()) === built.contentHash) {
    console.log(
      `unchanged (${built.contentHash.slice(0, 12)}) — wrote nothing`,
    );
  } else {
    const read = (file: string): string =>
      readFileSync(join(built.dir, file), "utf-8");
    const header = `// AUTO-GENERATED by scripts/bundle.ts — do not edit by hand.
// Regenerate from the packs pragma.conf.ts declares: \`bun run bundle\`.
`;
    writeFileSync(
      outPath,
      `${header}export const dataNq = ${JSON.stringify(read(DATA_FILE))};
export const schemaJson = ${JSON.stringify(read(SCHEMA_FILE))};
export const manifestJson = ${JSON.stringify(read(MANIFEST_FILE))};
`,
    );
    writeFileSync(
      indexOutPath,
      `${header}export const indexJson = ${JSON.stringify(read(INDEX_FILE))};\n`,
    );
    console.log(
      `Embedded pack ${built.contentHash.slice(0, 12)} — ${built.manifest.tripleCount} triples, ${built.manifest.entityCount} entities`,
    );
    console.log(`  from ${sourceRef}`);
  }
} finally {
  rmSync(cacheHome, { recursive: true, force: true });
}
