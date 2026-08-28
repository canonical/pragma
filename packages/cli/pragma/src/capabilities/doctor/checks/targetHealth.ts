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
  type SkillsDetection,
  skillsSkipReason,
  skillsSkipRemedy,
} from "../../setup/operations/index.js";
import { shortenPath, TARGET_IDS } from "../../setup/plan.js";
import type { CheckItem, CheckResult, ScopeBand } from "../types.js";
import { checkShellCompletions } from "./checkShellCompletions.js";
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
  if (!d.exists) return { status: "available", detail: `${path} not created` };
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
    ? { status: "pass", detail: `installed (${editors})` }
    : { status: "available", detail: `not installed (${editors})` };
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
    return {
      status: "skip",
      detail: "no harness config location in this band",
    };
  }
  const resolves = await commandResolves(MCP_SERVER_NAME, cwd);
  const items: CheckItem[] = d.groups.map((group) => {
    const state = mcpGroupState(d, group.path);
    const label = shortenPath(group.path, roots);
    if (state === "absent") {
      return { label, status: "available", detail: "not configured" };
    }
    if (state === "drifted") {
      return { label, status: "fail", detail: "entry differs from current" };
    }
    return {
      label,
      status: resolves ? "pass" : "fail",
      detail: resolves
        ? `entry current, \`${MCP_SERVER_NAME}\` resolves`
        : `entry current, \`${MCP_SERVER_NAME}\` is not on PATH`,
    };
  });
  const configured = items.filter((item) => item.status === "pass").length;
  const failing = items.filter((item) => item.status === "fail").length;
  if (failing > 0) {
    return {
      status: "fail",
      detail: `${failing} of ${items.length} need attention`,
      items,
    };
  }
  if (configured === 0) {
    // Project-band absence is not a failure: the band is opt-in, so a
    // repository with no checked-in MCP config is a healthy repository.
    return band === "project"
      ? { status: "skip", detail: "not configured for this project (opt-in)" }
      : {
          status: "available",
          detail: `${items.length} not configured`,
          items,
        };
  }
  return {
    status: configured === items.length ? "pass" : "available",
    detail: `${configured} of ${items.length} current`,
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
 * Run every banded check: the target table, both bands, in table order.
 *
 * @param rt - The per-invocation runtime.
 * @param bin - The binary name the `fix:` lines are derived from.
 * @returns One {@link CheckResult} per (target, band) the machine can hold.
 * @note Impure — every target's detection reads the real filesystem.
 */
export async function bandedChecks(
  rt: PragmaRuntime,
  bin: string,
): Promise<CheckResult[]> {
  const roots = await resolveRoots(rt);
  const detected = await detectTargets(rt, [...TARGET_IDS], "both");
  return Promise.all(
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
  );
}
