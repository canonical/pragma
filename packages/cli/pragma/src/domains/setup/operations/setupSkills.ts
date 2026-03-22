import { resolve } from "node:path";
import type { DetectedHarness } from "@canonical/harnesses";
import {
  deleteFile,
  exec,
  exists,
  flatMap,
  map,
  mkdir,
  pure,
  sequence,
  symlink,
  type Task,
} from "@canonical/task";
import type { DiscoveredSkill } from "../../skill/types.js";
import type { SetupSkillsResult, SymlinkAction } from "../types.js";

/** Cross-client skill directory, shared across all harnesses. */
const CROSS_CLIENT_DIR = ".agents/skills";

/**
 * Create or replace a single skill symlink, returning the action taken.
 *
 * @param skill - The discovered skill to symlink.
 * @param targetDir - Directory where the symlink will be created.
 * @param projectRoot - Project root for resolving absolute paths.
 * @param harnessName - Display name of the target harness.
 * @returns A Task yielding the SymlinkAction describing what happened.
 */
function symlinkOneSkill(
  skill: DiscoveredSkill,
  targetDir: string,
  projectRoot: string,
  harnessName: string,
): Task<SymlinkAction> {
  const target = resolve(projectRoot, skill.sourcePath);
  const linkPath = resolve(targetDir, skill.folderName);

  return flatMap(exists(linkPath), (linkExists) => {
    if (!linkExists) {
      return map(
        symlink(target, linkPath),
        (): SymlinkAction => ({
          skillName: skill.name,
          target,
          linkPath,
          action: "created",
          harnessName,
        }),
      );
    }

    return flatMap(
      exec("readlink", [linkPath]),
      (readlinkResult): Task<SymlinkAction> => {
        const currentTarget = readlinkResult.stdout.trim();
        if (currentTarget === target) {
          return pure({
            skillName: skill.name,
            target,
            linkPath,
            action: "skipped",
            harnessName,
          });
        }

        return map(
          flatMap(deleteFile(linkPath), () => symlink(target, linkPath)),
          (): SymlinkAction => ({
            skillName: skill.name,
            target,
            linkPath,
            action: "replaced",
            harnessName,
          }),
        );
      },
    );
  });
}

/**
 * Symlink all skills into a single target directory, creating the
 * directory if it does not exist.
 *
 * @param skills - Skills to symlink.
 * @param targetDir - Target directory path.
 * @param projectRoot - Project root for resolving absolute paths.
 * @param harnessName - Display name of the target harness.
 * @returns A Task yielding an array of SymlinkActions.
 */
function symlinkForTarget(
  skills: readonly DiscoveredSkill[],
  targetDir: string,
  projectRoot: string,
  harnessName: string,
): Task<SymlinkAction[]> {
  return flatMap(mkdir(targetDir), () =>
    map(
      sequence(
        skills.map((skill) =>
          symlinkOneSkill(skill, targetDir, projectRoot, harnessName),
        ),
      ),
      (actions) => [...actions],
    ),
  );
}

/**
 * Symlink discovered skills into each harness skill directory and the
 * cross-client `.agents/skills` directory. Idempotent: existing correct
 * symlinks are skipped, stale symlinks are replaced.
 *
 * @param skills - Skills discovered from installed packages.
 * @param harnesses - Detected AI harnesses to target.
 * @param projectRoot - Project root directory.
 * @returns A Task yielding a SetupSkillsResult summary.
 * @note Impure
 */
export default function setupSkills(
  skills: readonly DiscoveredSkill[],
  harnesses: readonly DetectedHarness[],
  projectRoot: string,
): Task<SetupSkillsResult> {
  const processedDirs = new Set<string>();
  const targets: { dir: string; name: string }[] = [];

  for (const detected of harnesses) {
    const dir = detected.harness.skillsPath(projectRoot);
    if (!processedDirs.has(dir)) {
      processedDirs.add(dir);
      targets.push({ dir, name: detected.harness.name });
    }
  }

  const crossClientDir = resolve(projectRoot, CROSS_CLIENT_DIR);
  if (!processedDirs.has(crossClientDir)) {
    processedDirs.add(crossClientDir);
    targets.push({ dir: crossClientDir, name: ".agents/skills" });
  }

  return map(
    sequence(
      targets.map(({ dir, name }) =>
        symlinkForTarget(skills, dir, projectRoot, name),
      ),
    ),
    (actionGroups): SetupSkillsResult => {
      const allActions = actionGroups.flat();
      const warnings = allActions
        .filter((a) => a.action === "replaced")
        .map(
          (a) =>
            `Replaced existing symlink for ${a.skillName} in ${a.harnessName}`,
        );

      return {
        actions: allActions,
        harnessCount: harnesses.length,
        skillCount: skills.length,
        warnings,
      };
    },
  );
}
