/**
 * The banded doctor rows, derived from the setup target table.
 *
 * `doctor` and `setup` are the SAME LIST. Every banded row here carries a
 * target id verbatim — `completions`, not "Shell completions"; `mcp`, not "MCP
 * configured" — because the row name IS the fix command's argument, and a user
 * who reads `✗ mcp` beside `fix: pragma setup mcp` can see that they are the
 * same thing. Two checks reporting on one target under two different names, one
 * of which no command accepts, is how a report ends up describing a machine
 * nobody can repair.
 *
 * Every row's detection comes from the target table's own `detect`, so the two
 * surfaces cannot disagree about what they looked at, and every `fix:` is
 * derived from the row's id and band rather than authored per check.
 *
 * Doctor's UNBANDED environment checks (Node version, the CLI's own version,
 * pack refs, the store) diagnose things setup cannot install and stay outside
 * this list.
 *
 * ONE banded row is not a target: `harnesses`, the per-band inventory. It is an
 * inventory of the machine the targets are measured against, not a target that
 * can be set up, so it deliberately carries no `fix:` and can never be `fail`
 * or `available` — see {@link inventoryChecks}. The bijection between the other
 * rows and the setup table is untouched: `harnesses` is not a `TargetId`, and
 * nothing derives a command from it.
 */

import { MCP_SERVER_NAME } from "../../../constants.js";
import type { PragmaRuntime } from "../../../kernel/runtime/index.js";
import {
  type DetectedRow,
  detectionFailure,
  detectTargets,
  resolveRoots,
} from "../../setup/buildPlan.js";
import type {
  CompletionsDetection,
  ConfigDetection,
} from "../../setup/operations/index.js";
import {
  type LspDetection,
  lspEditorNames,
  lspSkipReason,
  type McpDetection,
  mcpGroupState,
  mcpWriteState,
  type SkillsDetection,
  skillsSkipReason,
  skillsSkipRemedy,
} from "../../setup/operations/index.js";
import { shortenPath, TARGET_IDS } from "../../setup/plan.js";
import { MCP_NO_LOCATION } from "../../setup/targets.js";
import type { CheckItem, CheckResult, ScopeBand } from "../types.js";
import { checkShellCompletions } from "./checkShellCompletions.js";
import {
  harnessInventory,
  type InventoryGroup,
  type InventoryHarness,
  inventoryHealth,
} from "./harnessInventory.js";
import { commandResolves } from "./mcpCommand.js";

/** What a row reports before its name, band and `fix:` line are attached. */
interface Health {
  readonly status: CheckResult["status"];
  readonly detail: string;
  readonly items?: readonly CheckItem[];
  /**
   * A remedy that is NOT the derived setup command — the zsh activation line,
   * for instance, which setup cannot perform for the user. Absent means "the
   * fix is to run the target's own setup command", which is the default and the
   * reason the bijection holds without anyone authoring it.
   */
  readonly remedy?: string;
}

/** The `config` row: the global config file exists and parses. */
const configHealth = (
  d: ConfigDetection,
  roots: { global: string; project: string },
): Health => {
  const path = shortenPath(d.path, roots);
  if (!d.exists)
    return { status: "available", detail: `${path} does not exist yet` };
  if (!d.parses) {
    return { status: "fail", detail: `${path} cannot be parsed as JSON` };
  }
  return { status: "pass", detail: `${path} — valid` };
};

/** The `lsp` row — the first this report has ever had. */
const lspHealth = (d: LspDetection): Health => {
  if (d.state === "unknown") {
    return { status: "skip", detail: lspSkipReason(d) };
  }
  const editors = lspEditorNames(d).join(", ");
  return d.state === "installed"
    ? { status: "pass", detail: `installed in ${editors}` }
    : { status: "available", detail: `not installed in ${editors}` };
};

/**
 * The `mcp` row: one sub-item per file, each saying whether the entry is
 * present, current, and bootable. Two separate checks used to report this —
 * one for presence, one for command resolution — and the second judged every
 * server in the file, so a foreign server's dead command failed this CLI's row.
 */
async function mcpHealth(
  d: McpDetection,
  band: ScopeBand,
  cwd: string,
  roots: { global: string; project: string },
): Promise<Health> {
  if (d.groups.length === 0) {
    return { status: "skip", detail: MCP_NO_LOCATION[band] };
  }
  const resolves = await commandResolves(MCP_SERVER_NAME, cwd);
  const items: CheckItem[] = d.groups.map((group) => {
    const state = mcpGroupState(d, group.path);
    const label = shortenPath(group.path, roots);
    if (state === "absent") {
      return { label, status: "available", detail: "not registered" };
    }
    if (state === "drifted") {
      return { label, status: "fail", detail: "entry differs from current" };
    }
    return {
      label,
      status: resolves ? "pass" : "fail",
      detail: resolves
        ? `registered, and \`${MCP_SERVER_NAME}\` is on PATH`
        : `registered, but \`${MCP_SERVER_NAME}\` is not on PATH`,
    };
  });
  const configured = items.filter((item) => item.status === "pass").length;
  const failing = items.filter((item) => item.status === "fail").length;
  if (failing > 0) {
    return {
      status: "fail",
      detail: `${failing} of ${items.length} config files need attention`,
      items,
    };
  }
  if (configured === 0) {
    // Absence in the LOCAL PROJECT is not a failure: registering there is
    // opt-in, so a repository with no checked-in MCP config is healthy. The
    // line says so rather than leaving "(opt-in)" to be decoded.
    return band === "project"
      ? {
          status: "skip",
          detail:
            "not registered for this project — per-project registration is opt-in",
        }
      : {
          status: "available",
          detail: `not registered in any of ${items.length} config files`,
          items,
        };
  }
  return {
    status: configured === items.length ? "pass" : "available",
    detail: `registered in ${configured} of ${items.length} config files`,
    items,
  };
}

/** The `skills` row: every expected link present, lstat-verified, none stale. */
function skillsHealth(
  d: SkillsDetection,
  band: ScopeBand,
  roots: { global: string; project: string },
): Health {
  const short = shortenPath(d.sourceRoot, roots);
  // Stale links this band owns are work even when the root holds no skill, so
  // the row is only a skip once there is nothing left to reconcile either.
  const orphans = d.rootExists ? d.orphans.length : 0;
  if (!d.available && orphans === 0) {
    // The skip carries a remedy — `setup`'s row and this row are the same
    // finding, and the dead-end version of it ("no skills installed", no next
    // step) was reported identically by both surfaces.
    return {
      status: "skip",
      detail: skillsSkipReason(short, band, d.rootExists),
      remedy: skillsSkipRemedy(short, band),
    };
  }
  if (orphans > 0) {
    return {
      status: "available",
      detail: `${orphans} link${orphans === 1 ? "" : "s"} point at a skill that is gone`,
    };
  }
  const stale = d.actions.filter((a) => a.action === "replaced").length;
  const missing = d.actions.filter((a) => a.action === "created").length;
  if (stale > 0) {
    return {
      status: "fail",
      detail: `${stale} of ${d.actions.length} links point elsewhere`,
    };
  }
  // A hand-placed real directory is `skipped` like an already-correct link is,
  // and reporting the two the same way made this row say "links current" where
  // no link exists at all. Setup will never clear such a path — it is not this
  // command's to delete — so the row carries the only remedy that settles it.
  // A symlink pointing outside every root pragma owns is `skipped` so setup
  // will never delete it — which would make this row claim "links current" over
  // a path where the user's own link shadows a shipped skill. `skipped` also
  // covers an already-correct link (owned) and a real directory (blocked), so
  // the foreign case is what is left.
  const foreign = d.actions.filter(
    (a) => a.action === "skipped" && !a.owned && !a.blocked,
  ).length;
  if (foreign > 0) {
    return {
      status: "available",
      detail: `${foreign} of ${d.actions.length} link paths hold a symlink pragma does not own`,
      remedy:
        "Move or delete the symlink at that path, then link the skills again.",
    };
  }
  const blocked = d.actions.filter((a) => a.blocked).length;
  if (blocked > 0) {
    return {
      status: "available",
      detail: `${blocked} of ${d.actions.length} link paths hold a real directory`,
      remedy:
        "Move or delete the directory at that path, then link the skills again.",
    };
  }
  if (missing > 0) {
    return {
      status: "available",
      detail: `${missing} of ${d.actions.length} links not created`,
    };
  }
  return { status: "pass", detail: `${d.actions.length} links current` };
}

/**
 * Map one detected row onto its health. The `completions` row delegates to the
 * check that owns the three gates the script depends on — the resolver answers,
 * the installed bytes are current, and zsh has the directory on its `fpath`.
 */
async function healthOf(
  row: DetectedRow,
  rt: PragmaRuntime,
  roots: { global: string; project: string },
): Promise<Health> {
  // A detection that threw is reported as ITS OWN failing row. Letting the
  // rejection escape took the whole banded section of the report with it, so a
  // single unreadable config file left the user with no rows at all — the one
  // moment the report is most worth having.
  const failure = detectionFailure(row);
  if (failure !== undefined) return { status: "fail", detail: failure };
  switch (row.target.id) {
    case "config":
      return configHealth(row.detection as ConfigDetection, roots);
    case "completions": {
      const result = await checkShellCompletions(
        rt.cwd,
        row.detection as CompletionsDetection,
      );
      return {
        status: result.status,
        detail: result.detail,
        ...(result.remedy === undefined ? {} : { remedy: result.remedy }),
      };
    }
    case "lsp":
      return lspHealth(row.detection as LspDetection);
    case "mcp":
      return mcpHealth(row.detection as McpDetection, row.band, rt.cwd, roots);
    default:
      return skillsHealth(row.detection as SkillsDetection, row.band, roots);
  }
}

/** The banded inventory row's name — a LISTING, not a setup target id. */
export const INVENTORY_CHECK = "harnesses";

/**
 * The `harnesses` row for one band: what this machine has, and where pragma
 * stands in each.
 *
 * It is the one banded row that is NOT a target, and it earns that by never
 * competing with the ones that are. Its status is only `pass` or `skip`, so it
 * adds no failure and no `available` to the tally, and it derives no `fix:` —
 * the `mcp` and `skills` rows beside it already name every command a harness
 * needs, and repeating them here would be the same finding seen twice.
 *
 * The registry is the only thing detection could not supply: `detectHarnesses`
 * filters to hits, so "Windsurf is not on this machine" was unrepresentable
 * until the universe came from somewhere. Everything else — which harnesses
 * share which file, and whether each one's own entry in it is current — is read
 * straight off the `mcp` detection this report already ran. The projection to
 * {@link InventoryGroup} is deliberate: `McpDetection` holds
 * `writeMcpConfigTargets`/`removeMcpConfigFrom` as live functions, and a
 * `mutates: false` command should be unable to reach a writer, not merely
 * trusted not to.
 *
 * This is also where the harness↔`mcpKey` association is REJOINED, because it
 * is the one place that holds both halves: `TargetGroup` records the names
 * sharing a file and, separately, one write per distinct `mcpKey`, and the
 * registry is what says which key a given harness writes. Without that join the
 * only state available per harness is the file's aggregate — and a
 * `.vscode/mcp.json` where VS Code's `servers` entry is current while Cline's
 * `mcpServers` is absent aggregates to `drifted`, which would report BOTH
 * harnesses as drifted when neither one is.
 *
 * @param rt - The per-invocation runtime (read for `--verbose`).
 * @param rows - Every detected row, both bands, as `bandedChecks` has them.
 * @param roots - The roots every path renders relative to.
 * @returns One inventory {@link CheckResult} per band, global then project.
 * @note Impure — dynamically imports the harness registry.
 */
async function inventoryChecks(
  rt: PragmaRuntime,
  rows: readonly DetectedRow[],
  roots: { global: string; project: string },
): Promise<CheckResult[]> {
  const { harnesses, isHarnessInBand } = await import("@canonical/harnesses");
  const verbose = rt.globalFlags.verbose;
  const bands: readonly ScopeBand[] = ["global", "project"];
  // The key each harness NAME writes under — the half of the association
  // `groupConfigTargets` consumed and did not record. Names are the only
  // identity a group carries, and the registry's are unique.
  const keyByName = new Map(harnesses.map((h) => [h.name, h.mcpKey]));

  return bands.map((band): CheckResult => {
    // `isHarnessInBand(scope, band, band)` — the band as its OWN selection — is
    // exactly "does this harness have a config location here", which is the
    // question `detectMcp` already answers for that band. Asking it under the
    // `both` selection would instead answer "who writes here when both bands
    // run", and report every dual-scope harness as having no global band.
    const registry: InventoryHarness[] = harnesses.map((harness) => ({
      id: harness.id,
      name: harness.name,
      inBand: isHarnessInBand(harness.scope, band, band),
    }));

    const mcpRow = rows.find(
      (row) => row.target.id === "mcp" && row.band === band,
    );
    if (mcpRow === undefined || detectionFailure(mcpRow) !== undefined) {
      return {
        name: INVENTORY_CHECK,
        status: "skip",
        detail: "harness detection did not settle — see the `mcp` row",
        band,
      };
    }

    const detection = mcpRow.detection as McpDetection;
    const groups: InventoryGroup[] = detection.groups.map((group) => ({
      path: shortenPath(group.path, roots),
      harnesses: group.harnessNames.map((name) => {
        // The harness's OWN write in this file. A name the registry does not
        // know (or a key no write carries — impossible while the group was
        // built from the same registry) falls back to the file's aggregate:
        // strictly no worse than the state before this join existed.
        const write = group.writes.find(
          (w) => w.mcpKey === keyByName.get(name),
        );
        return {
          name,
          state:
            write === undefined
              ? mcpGroupState(detection, group.path)
              : mcpWriteState(detection, write),
        };
      }),
    }));

    const health = inventoryHealth(
      harnessInventory(registry, groups, band),
      verbose,
    );
    return {
      name: INVENTORY_CHECK,
      status: health.status,
      detail: health.detail,
      band,
      ...(health.items.length === 0 ? {} : { items: health.items }),
    };
  });
}

/**
 * The command that repairs a row — derived from its id and band, never
 * authored. This is the bijection made mechanical: a row exists because a
 * target exists, and its fix is that target's own invocation.
 */
export const fixCommandFor = (
  id: string,
  band: ScopeBand,
  bin: string,
): string => `${bin} setup ${id}${band === "project" ? " --local" : ""}`;

/**
 * Run every banded check: the target table, both bands, in table order, then
 * each band's harness inventory.
 *
 * The inventory rows come LAST within the array, and the renderer partitions by
 * band while preserving order, so each band's section ends with the listing of
 * what that band actually holds — the targets first, then the machine they were
 * measured against. They ride on the SAME detection pass: no target is probed a
 * second time to produce them.
 *
 * @param rt - The per-invocation runtime.
 * @param bin - The binary name the `fix:` lines are derived from.
 * @returns One {@link CheckResult} per (target, band), plus one per band.
 * @note Impure — every target's detection reads the real filesystem.
 */
export async function bandedChecks(
  rt: PragmaRuntime,
  bin: string,
): Promise<CheckResult[]> {
  const roots = await resolveRoots(rt);
  const detected = await detectTargets(rt, [...TARGET_IDS], "both");
  const [targetRows, inventoryRows] = await Promise.all([
    Promise.all(
      detected.map(async (row): Promise<CheckResult> => {
        const health = await healthOf(row, rt, roots);
        const needsFix =
          health.status === "fail" || health.status === "available";
        // A `skip` gets no DERIVED fix — re-running the target's own setup command
        // would reproduce the skip. But a skip that AUTHORED a remedy has found a
        // real next step on this machine (fill the band's skill root, say), and
        // dropping it is what made the skip a dead end on both surfaces.
        const remedy = needsFix
          ? (health.remedy ?? fixCommandFor(row.target.id, row.band, bin))
          : health.remedy;
        return {
          name: row.target.id,
          status: health.status,
          detail: health.detail,
          band: row.band,
          ...(health.items === undefined ? {} : { items: health.items }),
          ...(remedy === undefined ? {} : { remedy }),
        };
      }),
    ),
    inventoryChecks(rt, detected, roots),
  ]);
  return [...targetRows, ...inventoryRows];
}
