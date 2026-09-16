/**
 * Config-target grouping for scope-aware `setup mcp`/`skills`. Detected
 * harnesses often share one config file (VS Code and Cline both live in
 * `.vscode/mcp.json`), so writes are deduplicated at two levels: PROMPT-dedup by
 * path (one choice per file, labelled with every harness that shares it) and
 * WRITE-dedup by `(path, mcpKey)` (one write per distinct key — the JSON writer
 * only touches its own key, so two keys in one file each preserve the other).
 * The scope→band mapping (which harnesses run in which band for a `--scope`
 * selection) lives here too, since it decides which targets are grouped.
 */

import { resolveConfigTarget } from "./config.js";
import type { PlatformEnv } from "./platformPaths.js";
import { isProjectRelativeSignal } from "./signals.js";
import type {
  ConfigTarget,
  DetectedHarness,
  HarnessScope,
  ScopeBand,
} from "./types.js";

/**
 * The user's `--scope` selection. Shares the value set of {@link HarnessScope}:
 * `both` runs each harness's default band, `global`/`project` run only that
 * band (flipping dual-scope harnesses to the matching config).
 */
export type ScopeSelection = HarnessScope;

/** A file to configure, with the harnesses sharing it and its distinct writes. */
export interface TargetGroup {
  /** The shared config file path (the prompt-dedup key). */
  readonly path: string;
  /** Every detected harness name that resolves to this file. */
  readonly harnessNames: readonly string[];
  /** One {@link ConfigTarget} per distinct `mcpKey` written to this file. */
  readonly writes: readonly ConfigTarget[];
  /** The band this group belongs to. */
  readonly scope: ScopeBand;
}

/** The bands a `--scope` selection runs, in project→global order. */
export const resolveBandsForScope = (scope: ScopeSelection): ScopeBand[] =>
  scope === "both"
    ? ["project", "global"]
    : scope === "global"
      ? ["global"]
      : ["project"];

/**
 * Whether a harness of `harnessScope` participates in `band` under the user's
 * `scope` selection. The project band always takes project + both harnesses;
 * the global band takes global-only under `both` (a dual-scope harness has
 * already written its project file — no double-write), and global + both under
 * an explicit `global` selection (dual-scope flips to its home config).
 *
 * @param harnessScope - The harness's declared scope.
 * @param scope - The user's `--scope` selection.
 * @param band - The band being resolved.
 * @returns Whether the harness writes in this band.
 */
export const isHarnessInBand = (
  harnessScope: HarnessScope,
  scope: ScopeSelection,
  band: ScopeBand,
): boolean => {
  if (band === "project") {
    return harnessScope === "project" || harnessScope === "both";
  }
  if (scope === "both") return harnessScope === "global";
  return harnessScope === "global" || harnessScope === "both";
};

/**
 * Whether a dual-scope harness has EARNED the global band on this machine.
 *
 * `isHarnessInBand` answers "can this row write here", which is a fact about
 * the registry. This answers "should it", which is a fact about the evidence:
 * a `both` row detected only by something inside the checkout has said nothing
 * about the machine. A committed `.vscode/` directory is the case that forced
 * the question — it travels with the repository, so on its own it would have
 * created `<config>/Code/User/mcp.json` for every contributor who clones,
 * whether or not they have VS Code. The project band is the right home for
 * project evidence, and a `both` row always keeps it.
 *
 * A row whose EVERY declared signal is project-relative (`cursor`) has nothing
 * to earn the band with, so the rule does not apply to it: it keeps the
 * documented global location it has always written. The rule bites exactly
 * where a row declares user-level probes and none of them matched.
 *
 * @param d - One detected harness, carrying the signals that matched.
 * @returns Whether it belongs in the global band.
 * @note Pure — reads the detection record and the row's own signals.
 */
const earnedGlobalBand = (d: DetectedHarness): boolean => {
  if (d.harness.scope !== "both") return true;
  if (d.harness.detect.every(isProjectRelativeSignal)) return true;
  return d.matched.some((signal) => !isProjectRelativeSignal(signal));
};

/** The detected harnesses that participate in `band` under the `scope` selection. */
export const listHarnessesForBand = (
  detected: readonly DetectedHarness[],
  scope: ScopeSelection,
  band: ScopeBand,
): DetectedHarness[] =>
  detected.filter(
    (d) =>
      isHarnessInBand(d.harness.scope, scope, band) &&
      (band === "project" || earnedGlobalBand(d)),
  );

/**
 * Group a band's detected harnesses into per-file {@link TargetGroup}s: one
 * group per config path, carrying every sharing harness name and one write per
 * distinct `mcpKey`. Groups (and each group's names) are sorted for stable
 * output.
 *
 * @param detected - Harnesses already filtered to this band.
 * @param projectRoot - The project root for project-band paths.
 * @param band - The band whose target each harness resolves to.
 * @param platform - The captured host, for home-band paths.
 * @returns The deduplicated target groups, sorted by path.
 */
export const groupConfigTargets = (
  detected: readonly DetectedHarness[],
  projectRoot: string,
  band: ScopeBand,
  platform: PlatformEnv,
): TargetGroup[] => {
  const byPath = new Map<
    string,
    { names: Set<string>; keys: Set<string>; writes: ConfigTarget[] }
  >();

  for (const d of detected) {
    const target = resolveConfigTarget(d.harness, projectRoot, band, platform);
    // No location in this band on THIS host (the VS Code rows under WSL, whose
    // Linux-side per-user file no editor reads) — so no group, and a `both` row
    // is reached by its project file alone.
    if (target === undefined) continue;
    const group = byPath.get(target.path) ?? {
      names: new Set<string>(),
      keys: new Set<string>(),
      writes: [],
    };
    group.names.add(d.harness.name);
    if (!group.keys.has(target.mcpKey)) {
      group.keys.add(target.mcpKey);
      group.writes.push(target);
    }
    byPath.set(target.path, group);
  }

  return [...byPath.entries()]
    .map(([path, group]) => ({
      path,
      harnessNames: [...group.names].sort(),
      writes: group.writes,
      scope: band,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
};

/**
 * All target groups for a `--scope` selection, across every band it runs.
 * Convenience over {@link resolveBandsForScope} + {@link listHarnessesForBand} +
 * {@link groupConfigTargets} for the common "give me every file to configure"
 * caller.
 *
 * @param detected - All detected harnesses.
 * @param projectRoot - The project root.
 * @param scope - The user's `--scope` selection.
 * @param platform - The captured host.
 * @returns Every target group, project band before global, each sorted by path.
 */
export const groupTargetsForScope = (
  detected: readonly DetectedHarness[],
  projectRoot: string,
  scope: ScopeSelection,
  platform: PlatformEnv,
): TargetGroup[] =>
  resolveBandsForScope(scope).flatMap((band) =>
    groupConfigTargets(
      listHarnessesForBand(detected, scope, band),
      projectRoot,
      band,
      platform,
    ),
  );
