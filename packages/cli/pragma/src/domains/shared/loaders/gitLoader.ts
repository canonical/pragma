/**
 * Git cache package loader.
 *
 * Resolves semantic packages from the git ref cache at
 * `~/.cache/pragma/refs/<pkg>/<ref>/`, populated by `pragma update-refs`.
 *
 * Only handles `git` kind refs. File and npm refs are skipped.
 *
 * @note Impure — reads filesystem.
 */

import { existsSync } from "node:fs";
import type { PackageRef } from "../../refs/operations/parseRef.js";
import { gitCacheDir } from "../../refs/operations/paths.js";
import type { PackageLoader, SemanticPackage } from "../semanticPackage.js";
import readPackageDir from "./readPackageDir.js";

export default function createGitLoader(): PackageLoader {
  return {
    name: "git",
    resolve(ref: PackageRef): SemanticPackage | undefined {
      if (ref.kind !== "git") return undefined;

      const dir = gitCacheDir(ref.pkg, ref.ref);
      if (!existsSync(dir)) return undefined;

      const { version, graphs, skills, stories } = readPackageDir(dir);
      return { name: ref.pkg, version, source: "git", graphs, skills, stories };
    },
  };
}
