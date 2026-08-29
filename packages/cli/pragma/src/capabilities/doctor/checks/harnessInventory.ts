/**
 * The harness inventory: one row per harness per scope, saying what was detected
 * and whether pragma is registered in it.
 *
 * Every fact this needs was ALREADY COMPUTED and thrown away.
 * `TargetGroup.harnessNames` carries every harness sharing a config file and
 * both consumers reduced it to `shortenPath(group.path)`; `McpDetection`
 * carries the `absent`/`registered`/`drifted` classification of every WRITE in
 * that file. The only thing detection could NOT answer is the negative —
 * `detectHarnesses` filters to hits, so a harness the machine does not have was
 * unrepresentable — which is why the roll-up takes the REGISTRY alongside the
 * groups: the registry supplies the universe, the groups supply the state.
 *
 * The state arrives PER HARNESS, never per file. A shared `.vscode/mcp.json`
 * holds VS Code's `servers` and Cline's `mcpServers` as two independent
 * entries, so the file's aggregate — `drifted`, when one key is current and the
 * other absent — is the standing of NEITHER harness. Pairing each name with
 * the write it owns is the caller's job (it holds the registry's `mcpKey`s and
 * the group's writes); by the time a group reaches this module the association
 * is resolved and every name carries its own state.
 *
 * Three deliberate constraints:
 *
 * 1. **No `@canonical/harnesses` import, of any kind.** `capabilities/lazy.test`
 *    forbids one from any file statically reachable from `capabilities/index`,
 *    and its regex has no `import type` exemption. This module is reached only
 *    through `runChecks`'s dynamic import today, but it is written so that
 *    staying legal never depends on that: the inputs are declared here as
 *    narrow structural records.
 *
 * 2. **Narrowed to DATA, so `mutates: false` is enforced rather than asserted.**
 *    `McpDetection` is write-capable — it carries `writeMcpConfigTargets` and
 *    `removeMcpConfigFrom` as live function references. Projecting it down to
 *    {@link InventoryGroup} before it reaches this file means a read-only
 *    report literally cannot reach a writer.
 *
 * 3. **It never invents a failure.** The states an inventory can report map onto
 *    `pass`/`available`/`skip` and NEVER `fail` (see `../types.ts`): a machine
 *    that simply does not have Windsurf is not a broken machine, and the `mcp`
 *    row already owns the actionable finding for the harnesses it does have.
 *    Reporting it twice is how a failure count becomes noise.
 *
 * Placement: this is a doctor helper because doctor is its only consumer today,
 * and `shared/` is explicitly not a utility drawer (see `shared/index.ts`). It
 * is written to MOVE there unchanged — pure, no capability imports beyond the
 * scope type — the moment `setup`'s detection summary becomes the second caller.
 */

import type { CheckItem, CheckStatus, Scope } from "../types.js";

/**
 * What the inventory says about one harness in one scope.
 *
 * The vocabulary is deliberately NOT "installed". Two different claims used
 * to share that word — `DetectedHarness.configExists` ("the harness's own
 * config file exists", a harnesses-package field this module never surfaces)
 * and the pragma-entry state (`McpTargetState`, which now says `registered`
 * for exactly this reason). Every state here names the PRAGMA-ENTRY meaning.
 * One name per claim, held across the reports: "installed" is reserved for
 * artifacts the CLI itself places (the completion script, the LSP extension),
 * "registered" for pragma's entry in someone else's config, "linked" for
 * skill symlinks.
 *
 * - `registered` — detected, and pragma's MCP entry in this scope is current.
 * - `drifted` — detected, and a pragma entry exists but differs from what a
 *   write would emit. Actionable, but the `mcp` row is where it is actionED;
 *   here it is reported without inflating the failure count.
 * - `detected` — the harness is on this machine; pragma is not registered.
 * - `undetected` — in the registry, has a location in this scope, not found.
 * - `unscoped` — in the registry, but has NO config location in this scope at
 *   all (VS Code is `scope: "project"`, so it can never hold a global entry).
 *   Stated rather than omitted: a verbose listing that silently dropped a row
 *   reads as a bug in the listing.
 */
export type InventoryState =
  | "registered"
  | "drifted"
  | "detected"
  | "undetected"
  | "unscoped";

/** One harness's standing in one scope. */
export interface InventoryRow {
  readonly harnessId: string;
  readonly harnessName: string;
  readonly scope: Scope;
  readonly state: InventoryState;
  /** The config paths in this scope that carry (or would carry) the entry. */
  readonly locations: readonly string[];
}

/** A registry entry, narrowed to what the roll-up reads. */
export interface InventoryHarness {
  readonly id: string;
  readonly name: string;
  /** Whether this harness has a config location in the scope being rolled up. */
  readonly inScope: boolean;
}

/** The prior state of one harness's own write, as detection classified it. */
export type WriteState = "absent" | "registered" | "drifted";

/** One harness's share of a config file: the state of the write IT owns. */
export interface InventoryMember {
  readonly name: string;
  readonly state: WriteState;
}

/**
 * One detected config file, narrowed off {@link McpDetection}: the group's
 * already-shortened path, and every harness sharing it WITH ITS OWN state.
 *
 * Per harness, not per file — see the module docblock. A file-level state here
 * would report both harnesses sharing `.vscode/mcp.json` as drifted the moment
 * either one of them is registered alone.
 */
export interface InventoryGroup {
  readonly path: string;
  readonly harnesses: readonly InventoryMember[];
}

/** Whether a state means "this harness is on the machine". */
export const isDetectedState = (state: InventoryState): boolean =>
  state === "registered" || state === "drifted" || state === "detected";

/**
 * Roll one scope's detected config groups up against the registry into one row
 * per harness.
 *
 * Groups are keyed by harness NAME because that is the only identity
 * `TargetGroup` records; the registry is the map back to an id, which is why it
 * is a parameter rather than a lookup. A harness naming no registry row is
 * ignored rather than invented — the inventory reports on the registry, not on
 * whatever a group happened to say.
 *
 * @param registry - Every known harness, each flagged for scope membership.
 * @param groups - This scope's detected config files (narrowed, path-shortened),
 *   each naming the harnesses that share it with their own per-write state.
 * @param scope - The scope being rolled up.
 * @returns One row per registry harness, in registry order.
 * @note Pure — it reads no filesystem and holds no live effect.
 */
export function harnessInventory(
  registry: readonly InventoryHarness[],
  groups: readonly InventoryGroup[],
  scope: Scope,
): InventoryRow[] {
  const states = new Map<string, WriteState>();
  const locations = new Map<string, string[]>();
  for (const group of groups) {
    for (const member of group.harnesses) {
      const paths = locations.get(member.name) ?? [];
      paths.push(group.path);
      locations.set(member.name, paths);
      // A harness sharing two files is registered only where EVERY one of them
      // carries the current entry — the same "all or nothing" rule
      // `aggregateMcpStates` applies across the writes within a single file.
      const prior = states.get(member.name);
      states.set(
        member.name,
        prior === undefined || prior === member.state
          ? member.state
          : "drifted",
      );
    }
  }

  return registry.map((harness): InventoryRow => {
    const detected = states.get(harness.name);
    const paths = locations.get(harness.name) ?? [];
    const state: InventoryState =
      detected === undefined
        ? harness.inScope
          ? "undetected"
          : "unscoped"
        : detected === "registered"
          ? "registered"
          : detected === "drifted"
            ? "drifted"
            : "detected";
    return {
      harnessId: harness.id,
      harnessName: harness.name,
      scope,
      state,
      locations: paths,
    };
  });
}

/** The per-item status each state renders as. Never `fail` — see the docblock. */
const STATE_STATUS: Record<InventoryState, CheckStatus> = {
  registered: "pass",
  drifted: "available",
  detected: "available",
  undetected: "skip",
  unscoped: "skip",
};

/**
 * The phrase each state reads as, scope-aware for the unscoped case.
 *
 * The unscoped line says WHERE the harness keeps its config rather than naming
 * an internal partition. `no Global band` told the reader nothing: "band" was
 * this repository's word, and the fact underneath it — VS Code stores its MCP
 * config per project, so there is no global file for pragma to be in — is the
 * thing that explains the row.
 */
const stateDetail = (row: InventoryRow): string => {
  switch (row.state) {
    case "registered":
      return "registered";
    case "drifted":
      return "registered, entry differs from current";
    case "detected":
      return "detected, not registered";
    case "undetected":
      return "not detected";
    case "unscoped":
      return row.scope === "global"
        ? "keeps no global config — it is per-project only"
        : "keeps no per-project config — it is global only";
  }
};

/**
 * Project inventory rows into doctor sub-items.
 *
 * The default listing is DETECTED HARNESSES ONLY — a report that names every
 * tool the user does not have buries the ones they do. `--verbose` widens it to
 * the whole registry, which is the only view in which `undetected`/`unscoped`
 * rows appear at all.
 *
 * @param rows - This scope's inventory rows.
 * @param verbose - Whether to list the whole registry rather than the hits.
 * @returns The sub-items, harness name in the left column.
 */
export function inventoryItems(
  rows: readonly InventoryRow[],
  verbose: boolean,
): CheckItem[] {
  const shown = verbose
    ? rows
    : rows.filter((row) => isDetectedState(row.state));
  return shown.map((row): CheckItem => {
    const where = row.locations.join(", ");
    return {
      label: row.harnessName,
      status: STATE_STATUS[row.state],
      detail: where ? `${stateDetail(row)} — ${where}` : stateDetail(row),
    };
  });
}

/** The inventory check's headline, and whether it has anything to show. */
export interface InventoryHealth {
  readonly status: CheckStatus;
  readonly detail: string;
  readonly items: readonly CheckItem[];
}

/**
 * The whole inventory row for one scope: a listing, not a verdict.
 *
 * Its status is only ever `pass` (this scope has harnesses) or `skip` (it has
 * none). It is the one scoped row that is not a setup target, so it derives no
 * `fix:` line — the `mcp` and `skills` rows beside it own every action a
 * harness can need, and a second row proposing the same command would be the
 * "same finding seen twice" the report is built to avoid.
 *
 * @param rows - This scope's inventory rows.
 * @param verbose - Whether the listing widens to the whole registry.
 * @returns The status, headline and sub-items for the scope's inventory check.
 */
export function inventoryHealth(
  rows: readonly InventoryRow[],
  verbose: boolean,
): InventoryHealth {
  const detected = rows.filter((row) => isDetectedState(row.state));
  const registered = rows.filter((row) => row.state === "registered");
  const items = inventoryItems(rows, verbose);
  if (detected.length === 0) {
    return {
      status: "skip",
      detail: verbose
        ? `none of ${rows.length} known harnesses detected`
        : "no harnesses detected",
      items,
    };
  }
  return {
    status: "pass",
    detail: `${detected.length} detected · ${registered.length} registered${
      verbose ? ` · ${rows.length} known` : ""
    }`,
    items,
  };
}
