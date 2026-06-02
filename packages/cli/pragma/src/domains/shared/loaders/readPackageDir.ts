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
import type { GraphContent, SkillEntry } from "../semanticPackage.js";

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
  readonly skills: SkillEntry[];
}

/**
 * Read semantic package content from a directory.
 *
 * @param dir - Absolute path to the package root directory.
 * @returns Package version, TTL graph content, and skill entries.
 */
export default function readPackageDir(dir: string): PackageDirContents {
  return {
    version: readVersion(dir),
    graphs: readGraphs(dir),
    skills: readSkills(dir),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readVersion(dir: string): string {
  const pjsonPath = join(dir, "package.json");
  try {
    const raw = readFileSync(pjsonPath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
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
