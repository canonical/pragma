/**
 * Read semantic content from a package directory on disk.
 *
 * Shared by LocalLoader and GitLoader. Given a directory path, reads
 * package.json for version, globs TTL files from definitions/ and data/,
 * and scans skills/ for subdirectories.
 *
 * @note Impure — reads filesystem.
 */

import {
  existsSync,
  globSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import type {
  GraphContent,
  SkillEntry,
  StoryFileEntry,
} from "../semanticPackage.js";

// ---------------------------------------------------------------------------
// TTL discovery convention
// ---------------------------------------------------------------------------

const TTL_DIRS: readonly { dir: string; glob: string }[] = [
  { dir: "definitions", glob: "definitions/**/*.ttl" },
  { dir: "data", glob: "data/**/*.ttl" },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PackageDirContents {
  readonly version: string;
  readonly graphs: GraphContent[];
  readonly prefixes?: Readonly<Record<string, string>>;
  readonly skills: SkillEntry[];
  readonly stories: StoryFileEntry[];
}

/**
 * Read semantic package content from a directory.
 *
 * @param dir - Absolute path to the package root directory.
 * @returns Package version, TTL graph content, declared prefixes, and skills.
 */
export default function readPackageDir(dir: string): PackageDirContents {
  const manifest = readManifest(dir);
  const prefixes = parsePrefixesField(manifest);
  return {
    version: typeof manifest.version === "string" ? manifest.version : "0.0.0",
    graphs: readGraphs(dir),
    ...(prefixes ? { prefixes } : {}),
    skills: readSkills(dir),
    stories: readStories(dir),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A package.json shape with the fields this loader reads. */
interface PackageManifest {
  readonly version?: unknown;
  readonly pragma?: unknown;
}

/** Read and parse `package.json`, returning an empty object on failure. */
function readManifest(dir: string): PackageManifest {
  try {
    return JSON.parse(
      readFileSync(join(dir, "package.json"), "utf-8"),
    ) as PackageManifest;
  } catch {
    return {};
  }
}

/**
 * Extract package-declared prefixes from a parsed manifest.
 *
 * Convention: a package declares its namespaces under
 * `pragma.prefixes` in `package.json`, e.g.
 * `{ "pragma": { "prefixes": { "ds": "https://ds.canonical.com/" } } }`.
 * Chosen over a separate file because the manifest is already read for the
 * version, keeping the convention zero-extra-file and discoverable. Only
 * string→string entries are kept; malformed shapes are ignored so one bad
 * field cannot break boot.
 *
 * @returns The declared prefix map, or `undefined` when none is present.
 */
function parsePrefixesField(
  manifest: PackageManifest,
): Readonly<Record<string, string>> | undefined {
  const pragma = manifest.pragma;
  if (typeof pragma !== "object" || pragma === null) return undefined;
  const raw = (pragma as { prefixes?: unknown }).prefixes;
  if (typeof raw !== "object" || raw === null) return undefined;

  const prefixes: Record<string, string> = {};
  for (const [name, namespace] of Object.entries(raw)) {
    if (typeof namespace === "string") prefixes[name] = namespace;
  }
  return Object.keys(prefixes).length > 0 ? prefixes : undefined;
}

function readGraphs(dir: string): GraphContent[] {
  const graphs: GraphContent[] = [];

  for (const entry of TTL_DIRS) {
    if (!existsSync(join(dir, entry.dir))) continue;

    const files = globSync(entry.glob, { cwd: dir });
    for (const file of files) {
      const absPath = join(dir, file);
      try {
        const content = readFileSync(absPath, "utf-8");
        graphs.push({ path: absPath, content, format: "turtle" });
      } catch {
        // Unreadable file — skip silently
      }
    }
  }

  return graphs;
}

function readStories(dir: string): StoryFileEntry[] {
  const storiesDir = join(dir, "stories");
  if (!existsSync(storiesDir)) return [];

  const stories: StoryFileEntry[] = [];
  try {
    // Sorted: readdir order is filesystem-dependent, and story collision
    // resolution must be deterministic across platforms.
    for (const entry of [...readdirSync(storiesDir)].sort()) {
      if (!entry.endsWith(".json")) continue;
      const entryPath = join(storiesDir, entry);
      try {
        stories.push({
          path: entryPath,
          definition: JSON.parse(readFileSync(entryPath, "utf-8")),
        });
      } catch {
        process.stderr.write(
          `Warning: invalid JSON in story file ${entryPath}\n`,
        );
      }
    }
  } catch {
    // readdir failed — no stories
  }

  return stories;
}

function readSkills(dir: string): SkillEntry[] {
  const skillsDir = join(dir, "skills");
  if (!existsSync(skillsDir)) return [];

  const skills: SkillEntry[] = [];
  try {
    const entries = readdirSync(skillsDir);
    for (const entry of entries) {
      const entryPath = join(skillsDir, entry);
      try {
        if (statSync(entryPath).isDirectory()) {
          skills.push({ dir: entryPath, folderName: entry });
        }
      } catch {
        // stat failed — skip
      }
    }
  } catch {
    // readdir failed — no skills
  }

  return skills;
}
