/**
 * Compile the embedded pack — and the bundled skills — from `pragma.conf.ts`.
 *
 * Resolves the distribution's own declared packs through the PRODUCT's pipeline
 * (`parsePackDeclaration` → `resolvePackage` → `buildPack`, with `sources
 * update`'s own prefix precedence) into a throwaway cache, then inlines the five
 * artifacts as escaped JS strings, across three generated modules (the carried
 * `stories.json` gets its own so the dispatch path never loads the n-quads). Inlining (rather than shipping file assets)
 * is what lets the pack travel with the emitted modules with no asset step, so a
 * cold install answers store-backed reads offline.
 *
 * NOT byte-reproducible, and deliberately does not try to be: `data.nq`'s blank
 * node labels and `schema.json`'s SHACL value order are store-order artifacts.
 * Instead the script writes NOTHING when everything the committed manifest
 * asserts — its `contentHash` over the resolved TTL inputs AND the `prefixes`,
 * `version` and `sourceRef` this script supplies — is unchanged. Re-running
 * against unchanged upstream sources therefore produces a zero diff, which is
 * strictly stronger than byte-reproducibility. The one thing the skip cannot
 * see is a TOOLCHAIN change with unchanged inputs; that is caught rather than
 * silent (`probe.test.ts` and `wasmEmbed.test.ts` both boot the committed embed
 * on every test run), and deleting `pack.generated.ts` forces a full
 * regeneration.
 *
 * THE SAME RESOLUTION ALSO SHIPS THE PACKS' SKILLS. Every pack this script
 * clones has its `skills/<name>/SKILL.md` on disk at the moment the graph is
 * read out of it, and until now that was thrown away with the throwaway cache:
 * a fresh install answered `block lookup` offline and listed ZERO skills.
 * {@link writeBundledSkills} copies them into the committed `bundled-skills/`
 * directory at the package root — the skills half of the snapshot the graph
 * already had. It runs OUTSIDE the unchanged-skip below, for two reasons: a
 * directory copy IS byte-reproducible (unlike the n-quads), so re-running
 * against unchanged upstream still produces a zero diff without a skip; and the
 * manifest's `contentHash` covers the resolved TTL inputs ONLY, so a pack that
 * edits a SKILL.md and no `.ttl` is invisible to it — skipping on that hash
 * would silently ship the previous release's skills forever.
 *
 * Needs the network (a shallow clone per git pack), so it is NOT part of
 * `build` / `build:all`: a PR build must not clone three repositories, and the
 * artifacts are committed. It runs in exactly two places — a maintainer's
 * deliberate `bun run bundle`, and the release's version job
 * (`.github/actions/lerna-version`), which refreshes the snapshot into the
 * tagged commit so a fresh install never ships a graph weeks behind its own
 * release. The zero-diff-on-unchanged-inputs property above is what makes that
 * release step free of churn.
 */

import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
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
  STORIES_FILE,
} from "../src/kernel/runtime/graphpack/types.js";
import { headCommit } from "../src/kernel/runtime/refs/gitOps.js";
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
 * source, which is the correct ref for real users — a published package carries no
 * `node_modules`. Delete the entry once the remote is reachable from the build.
 */
const SOURCE_OVERRIDES: Readonly<Record<string, PackDeclaration>> = {
  "@canonical/anatomy-dsl": { name: "@canonical/anatomy-dsl" }, // no `source` ⇒ npm
};

/**
 * The pack this repository IS.
 *
 * `@canonical/ds-implementations` is COLLECTED FROM this monorepo into the root
 * `data/` directory, and `pragma.conf.ts` declares it as a git ref on `#main` —
 * the correct source for a real user, and the wrong one for this script at
 * release time. The version job regenerates that data with the new version and
 * its `versionedLink`s and THEN bundles, all BEFORE `git-commit.sh` makes the
 * commit and tag, so a clone of `#main` would embed the PREVIOUS release's
 * implementation graph into the artifact tagged for this one. The self-pack
 * therefore reads the working tree, which is exactly the tree that becomes the
 * tag.
 *
 * Nothing machine-specific reaches the artifact: the provenance recorded is
 * `self:v<version>` — the tag this bundle is for — never the checkout path.
 * That is also why this bypasses the `file:` refusal below rather than relaxing
 * it: every OTHER local path would pin a developer's filesystem.
 */
const SELF_PACK = "@canonical/ds-implementations";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const embeddedDir = join(packageRoot, "src/kernel/runtime/graphpack/embedded");
const outPath = join(embeddedDir, "pack.generated.ts");
// The index string lives in its OWN module so the storeless `__complete` path
// (entitySource) imports only it — never the n-quads/schema/manifest strings.
const indexOutPath = join(embeddedDir, "pack.index.generated.ts");
// Likewise the carried stories: dispatch reads them on every command, and
// putting them in `pack.generated.ts` would load its ~1.9 MB of n-quads with
// them (a measured +28 ms on every invocation).
const storiesOutPath = join(embeddedDir, "pack.stories.generated.ts");
/**
 * The committed skills snapshot, at the PACKAGE ROOT (not `dist/`, not `src/`).
 *
 * `dist/` is wrong because nothing committed produces it: `bundle` is a
 * release-time step deliberately outside `build`, so an artifact only `bundle`
 * writes has to live where git holds it — exactly as `pack.generated.ts` does.
 * `src/` is wrong because `tsc` copies no non-TS file into `dist/`, and because
 * biome's include list covers everything under `src`, which would start linting
 * whatever JSON an upstream skill happens to ship. The package root is the same place a design-system
 * pack puts its own `skills/`, which is the layout this is a snapshot OF.
 * `package.json`'s `files` allowlists the directory by name.
 */
const skillsOutDir = join(packageRoot, "bundled-skills");

const entryName = (entry: PackDeclaration): string =>
  typeof entry === "string" ? entry : entry.name;

/**
 * A package's skill folders: immediate children of `<root>/skills` that hold a
 * `SKILL.md`, sorted so the copy order is deterministic.
 *
 * `statSync`, not `lstatSync`, and it is the same call
 * `capabilities/sources/installSkills.ts` makes for the same reason: a package
 * that ships `skills/<name>` as a SYMLINK (the ordinary pnpm / monorepo /
 * `file:` layout) contributed nothing at all, silently, under `lstat`.
 */
function packageSkillDirs(root: string): string[] {
  const skillsDir = join(root, "skills");
  let names: string[];
  try {
    names = readdirSync(skillsDir);
  } catch {
    return []; // No `skills/` dir — a pack that ships none.
  }
  return names
    .sort()
    .map((name) => join(skillsDir, name))
    .filter((dir) => {
      try {
        return statSync(dir).isDirectory() && existsSync(join(dir, "SKILL.md"));
      } catch {
        return false; // Unreadable entry — skip, as discovery does.
      }
    });
}

/** Total bytes of a directory tree, for the packaging figure this logs. */
function treeBytes(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? treeBytes(path) : statSync(path).size;
  }
  return total;
}

/**
 * Copy every resolved pack's `skills/*` into the committed `bundled-skills/`
 * root, replacing whatever was there.
 *
 * ALL FOUR DECLARED PACKS contribute, for the same reason the graph snapshot
 * takes all four: the packs are the distribution's declared content, and a
 * subset would mean the shipped skills and the shipped graph disagreed about
 * which packs this release is. (`@canonical/anatomy-dsl` resolves through
 * {@link SOURCE_OVERRIDES} from `node_modules` here, so its skills — if it ever
 * ships any — come from the npm tarball rather than the git ref, the identical
 * caveat the manifest's `sourceRef` already records for its triples.)
 *
 * COPIED, not linked: the artifact is committed and published in a tarball, and
 * neither git nor npm can carry a link into a build machine's ref cache.
 *
 * The whole directory is REMOVED first, which is what retires a skill a pack has
 * since dropped — the copy pass walks the packages and so can only ever visit a
 * skill that still exists, the same blind spot `planStaleLinkPrunes` exists to
 * cover at run time. Rewriting rather than patching is safe here precisely
 * because a file copy is byte-reproducible: unchanged upstream ⇒ zero git diff.
 *
 * @param packs - The resolved packages, in declaration order.
 * @returns The folder names copied, and the total bytes written.
 * @throws When the packs yielded no skills at all — shipping none is the defect
 *   this artifact exists to fix, so it fails loudly rather than committing an
 *   empty directory that would look like a working snapshot.
 * @note Impure — deletes and rewrites `bundled-skills/`.
 */
function writeBundledSkills(packs: readonly { name: string; root: string }[]): {
  folders: string[];
  bytes: number;
} {
  rmSync(skillsOutDir, { recursive: true, force: true });
  const seen = new Set<string>();
  for (const pkg of packs) {
    for (const dir of packageSkillDirs(pkg.root)) {
      const folder = basename(dir);
      // First-seen wins on a folder-name clash across packs — the SAME rule
      // `planSkillInstall` applies when installing them for real, so the
      // snapshot cannot disagree with what a `sources update` would produce.
      if (seen.has(folder)) continue;
      seen.add(folder);
      // `dereference`: a pack whose `skills/<name>` (or a file beneath it) is a
      // symlink must contribute its CONTENT, never a link that resolves only on
      // the build machine.
      cpSync(dir, join(skillsOutDir, folder), {
        recursive: true,
        dereference: true,
      });
    }
  }
  const folders = [...seen].sort();
  if (folders.length === 0) {
    throw new Error(
      `The ${packs.length} resolved pack(s) provided 0 skills — refusing to commit an empty bundled-skills/ snapshot.`,
    );
  }
  return { folders, bytes: treeBytes(skillsOutDir) };
}

/** The committed embed's manifest JSON, or `undefined` when there is none. */
async function readCommittedManifest(): Promise<string | undefined> {
  try {
    const { manifestJson } = await import(
      "../src/kernel/runtime/graphpack/embedded/pack.generated.js"
    );
    return manifestJson as string;
  } catch {
    // No committed embed (or it is unreadable) — regenerate from scratch.
    return undefined;
  }
}

/**
 * What the skip compares: everything a manifest asserts except its build time.
 *
 * NOT `contentHash` alone. That hashes the resolved TTL inputs only — the
 * `prefixes`, `version` and `sourceRef` are supplied by this script and never
 * reach it, so a `pragma.conf.ts` prefix pin, a release bump, or an upstream
 * revision that moved without touching a `.ttl` would all print `unchanged` and
 * leave the committed artifact asserting the old ones.
 */
const packIdentity = (manifestJson: string): string =>
  JSON.stringify({
    ...(JSON.parse(manifestJson) as Record<string, unknown>),
    createdAt: "",
  });

// Build into an isolated cache so the developer's real cache is untouched and
// every run re-resolves its refs rather than reusing a stale checkout.
const cacheHome = mkdtempSync(join(tmpdir(), "pragma-bundle-"));
process.env.XDG_CACHE_HOME = cacheHome;

try {
  const declared = defaults.packs ?? [];
  const resolved = [];
  for (const entry of declared) {
    if (entryName(entry) === SELF_PACK) {
      const repoRoot = join(packageRoot, "../../..");
      console.log(`Resolving ${SELF_PACK} (self)`);
      const pkg = await resolvePackage(
        parsePackDeclaration({ name: SELF_PACK, source: `file://${repoRoot}` }),
        { cwd: packageRoot },
      );
      // `resolved` is the local path on the file lane; replace it with the tag
      // this bundle is for, so the manifest never carries a build machine's
      // filesystem. `headCommit` is read only to fail loudly when the working
      // tree is not a git checkout of this repository at all.
      headCommit(repoRoot);
      resolved.push({ ...pkg, kind: "self", resolved: `v${VERSION}` });
      continue;
    }
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
  const stories = resolved.flatMap((pkg) => pkg.stories);
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
    stories,
  });
  if (built.manifest.tripleCount === 0) {
    throw new Error(
      "The declared packs parsed to 0 RDF triples — refusing to embed an empty graph.",
    );
  }

  const read = (file: string): string =>
    readFileSync(join(built.dir, file), "utf-8");
  const header = `// AUTO-GENERATED by scripts/bundle.ts — do not edit by hand.
// Regenerate from the packs pragma.conf.ts declares: \`bun run bundle\`.
`;
  const modules = [
    {
      path: outPath,
      body: `export const dataNq = ${JSON.stringify(read(DATA_FILE))};
export const schemaJson = ${JSON.stringify(read(SCHEMA_FILE))};
export const manifestJson = ${JSON.stringify(read(MANIFEST_FILE))};
`,
    },
    {
      path: indexOutPath,
      body: `export const indexJson = ${JSON.stringify(read(INDEX_FILE))};\n`,
    },
    {
      path: storiesOutPath,
      body: `export const storiesJson = ${JSON.stringify(read(STORIES_FILE))};\n`,
    },
  ];

  // Unconditional, and deliberately ahead of the unchanged-skip: see the module
  // docblock — the manifest hash cannot see a skills-only upstream change, and a
  // file copy needs no skip to stay diff-free.
  const skills = writeBundledSkills(resolved);
  console.log(
    `Bundled ${skills.folders.length} skill(s) → bundled-skills/ (${(skills.bytes / 1024).toFixed(1)} KiB): ${skills.folders.join(", ")}`,
  );

  const committed = await readCommittedManifest();
  const unchanged =
    committed !== undefined &&
    packIdentity(committed) === packIdentity(read(MANIFEST_FILE));
  // On an unchanged pack, write only the modules that are ABSENT. Adding a
  // generated module for content the packages do not yet ship leaves the hash
  // identical, so a plain skip would never create the new module at all — and a
  // plain rewrite would churn the 1.9 MB data module against freshly-resolved
  // (never byte-reproducible) upstream, which is exactly what the skip exists
  // to prevent.
  const pending = unchanged
    ? modules.filter((module) => !existsSync(module.path))
    : modules;
  for (const module of pending)
    writeFileSync(module.path, header + module.body);

  if (pending.length === 0) {
    console.log(
      `unchanged (${built.contentHash.slice(0, 12)}) — wrote nothing`,
    );
  } else if (unchanged) {
    console.log(
      `unchanged (${built.contentHash.slice(0, 12)}) — wrote ${pending.length} missing module(s)`,
    );
  } else {
    console.log(
      `Embedded pack ${built.contentHash.slice(0, 12)} — ${built.manifest.tripleCount} triples, ${built.manifest.entityCount} entities, ${stories.length} carried story file(s)`,
    );
    console.log(`  from ${sourceRef}`);
  }
} finally {
  rmSync(cacheHome, { recursive: true, force: true });
}
