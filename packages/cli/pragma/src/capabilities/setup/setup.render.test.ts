/**
 * Render goldens for `pragma setup` — the plan, the progress lines, the recap.
 *
 * These three used to be three unrelated renderers over a tagged result union
 * with one member per sub-verb, and the run-all's member carried only a list of
 * step NAMES: a run could report "Setup complete — ran: completions, lsp, mcp"
 * while silently having dropped a target it could not offer. The goldens below
 * pin the property that replaces that — the preview, the progress stream and
 * the recap are the SAME rows — by rendering ONE plan three ways and asserting
 * every byte of each.
 *
 * The formatters take an injected style, and `defaultStyle()` is the identity
 * styler off a TTY, so no chalk-level dance is needed.
 */

import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { type PlanRow, type SetupPlan, shortenPath } from "./plan.js";
import {
  renderPlanTable,
  renderProgressLine,
  renderRecap,
} from "./plan.render.js";
import { PREVIEW_HINT, renderDryRun, setupFormatters } from "./setup.render.js";

const ROOTS = { global: "/home/u", project: "/home/u/src/app" };

/** The five rows a first global run produces on a machine with no editor. */
const ROWS: PlanRow[] = [
  {
    target: "config",
    scope: "global",
    action: "none",
    detail: "~/.config/pragma/config.json — present",
    selected: false,
  },
  {
    target: "completions",
    scope: "global",
    action: "install",
    detail: "bash → ~/.local/share/bash-completion/completions/pragma",
    selected: true,
  },
  {
    target: "lsp",
    scope: "global",
    action: "skip",
    detail:
      "no VS Code-family editor CLI on PATH (code, codium, cursor, windsurf)",
    reason:
      "no VS Code-family editor CLI on PATH (code, codium, cursor, windsurf)",
    selected: false,
  },
  {
    target: "mcp",
    scope: "global",
    action: "update",
    detail: "2 config files",
    children: [
      { key: "/home/u/.claude.json", label: "~/.claude.json", action: "add" },
      {
        key: "/home/u/.codeium/windsurf/mcp_config.json",
        label: "~/.codeium/windsurf/mcp_config.json",
        action: "add",
      },
    ],
    selected: true,
  },
  {
    target: "skills",
    scope: "global",
    action: "link",
    detail: "2 skills → 2 folders (~/.claude/skills, ~/.agents/skills)",
    selected: true,
  },
];

const PLAN: SetupPlan = { scope: "global", roots: ROOTS, rows: ROWS };

/** The same plan after a run: outcomes filled in, nothing else changed. */
const APPLIED: SetupPlan = {
  ...PLAN,
  rows: ROWS.map((row): PlanRow => {
    if (row.target === "lsp") {
      return {
        ...row,
        outcome: {
          status: "skipped",
          remedy:
            "no action is possible on this machine yet — install VS Code or VSCodium, then run this again",
        },
      };
    }
    if (row.target === "config") return { ...row, outcome: { status: "noop" } };
    if (row.target === "mcp") {
      return { ...row, outcome: { status: "done", note: "2 added" } };
    }
    if (row.target === "completions") {
      return { ...row, outcome: { status: "done", note: "installed" } };
    }
    return { ...row, outcome: { status: "done", note: "linked" } };
  }),
};

describe("the setup plan renders as one table", () => {
  it("names the scope and both roots once, then one row per target", () => {
    // The header carries the roots so no row repeats an absolute prefix, and
    // EVERY target is a row — including the one that will skip, which is the
    // whole point: a target that cannot be offered is named, not omitted.
    //
    // The middle column is a column of VERBS. Three things are pinned here that
    // it used to get wrong: `mcp` reads `install` rather than `2 files` (a count
    // is not an action, and the row-level token `update` disagreed with every
    // one of its own `(add)` children); a row whose children all do the same
    // thing prints their labels bare, because the verb has already said what
    // happens to them; and the two quiet outcomes are told apart in words —
    // `no change` for something already correct, `nothing to do` for something
    // there is nothing to act on — with the reason beside each.
    expect(renderPlanTable(PLAN, { lead: "Setup plan" })).toBe(
      [
        "Setup plan — global (home: ~ · project: ~/src/app)",
        "",
        "  config       no change      ~/.config/pragma/config.json — present",
        "  completions  install        bash → ~/.local/share/bash-completion/completions/pragma",
        "  lsp          nothing to do  no VS Code-family editor CLI on PATH (code, codium, cursor, windsurf)",
        "  mcp          install        ~/.claude.json · ~/.codeium/windsurf/mcp_config.json",
        "  skills       link           2 skills → 2 folders (~/.claude/skills, ~/.agents/skills)",
      ].join("\n"),
    );
  });

  it("an explicit dry run names itself, not the consent it was not asked for", () => {
    // Two previews, two last lines. `--dry-run` was asked for and answered, so
    // telling the user to "run again with --yes" would be advice for a question
    // they did not ask; the run that was DENIED consent is the one where that
    // is the useful next step.
    expect(renderDryRun({ ...PLAN, preview: true })).toContain(
      "Dry run — nothing applied.",
    );
    expect(renderDryRun({ ...PLAN, preview: true })).not.toContain("--yes");
  });

  it("a non-interactive run without consent previews and says so", () => {
    const preview = setupFormatters.plain({ ...PLAN, preview: true });
    expect(preview).toContain("Setup plan — global");
    expect(preview.endsWith(`\n\n${PREVIEW_HINT}`)).toBe(true);
  });

  it("groups the rows under scope headings when a run covers both", () => {
    const both: SetupPlan = {
      scope: "both",
      roots: ROOTS,
      rows: [
        ROWS[3] as PlanRow,
        {
          target: "mcp",
          scope: "project",
          action: "skip",
          detail: "no AI harness in this project keeps a per-project config",
          reason: "no AI harness in this project keeps a per-project config",
          selected: false,
        },
      ],
    };
    const out = renderPlanTable(both, { lead: "Setup plan" });
    expect(out).toContain("Global");
    expect(out).toContain("Local project");
    expect(out).toContain("global and local project");
    // "band" was the type layer's word for this partition; the vocabulary
    // retired it, and it may not return through any of the three renders.
    expect(out).not.toMatch(/\bbands?\b/);
  });
});

describe("the recap is the plan replayed", () => {
  it("counts the rows it took responsibility for and carries each row's outcome", () => {
    expect(renderRecap(APPLIED)).toBe(
      [
        "Setup: 4 of 4 targets configured — global",
        "  ✓ config       ~/.config/pragma/config.json — present",
        "  ✓ completions  bash → ~/.local/share/bash-completion/completions/pragma — installed",
        "  ○ lsp          skipped: no VS Code-family editor CLI on PATH (code, codium, cursor, windsurf)",
        "      no action is possible on this machine yet — install VS Code or VSCodium, then run this again",
        "  ✓ mcp          2 config files — 2 added",
        "  ✓ skills       2 skills → 2 folders (~/.claude/skills, ~/.agents/skills) — linked",
        "",
        "Check this again any time with `pragma doctor`.",
      ].join("\n"),
    );
  });

  it("a skip carries its reason and never counts as a failure", () => {
    const lsp = APPLIED.rows.find((row) => row.target === "lsp") as PlanRow;
    expect(renderProgressLine(lsp, 11)).toBe(
      "○ lsp          skipped: no VS Code-family editor CLI on PATH (code, codium, cursor, windsurf)",
    );
  });

  it("the plain formatter picks the recap once a run has happened", () => {
    expect(setupFormatters.plain(APPLIED)).toBe(renderRecap(APPLIED));
    expect(setupFormatters.plain(PLAN)).toBe(
      renderPlanTable(PLAN, { lead: "Setup plan" }),
    );
  });
});

describe("a row that did not run never renders as one that did", () => {
  it("an unselected row gets a neutral marker, not a green check", () => {
    // The row was offered and left unselected: neither done nor skipped for a
    // reason. A ✓ here is the same claim the old recap made when it reported
    // "Setup complete" over a target it had quietly dropped.
    const row: PlanRow = {
      target: "mcp",
      scope: "global",
      action: "update",
      detail: "1 file",
      selected: false,
    };
    expect(renderProgressLine(row, 3)).toBe("· mcp  1 file — not selected");
  });

  it("a converged run recaps its noop rows instead of printing a plan", () => {
    // Every row already current: nothing is selected, because there is nothing
    // to do. That is a RESULT, and gating the recap on `selected` made the one
    // command that had just verified the machine report itself as a preview.
    const converged: SetupPlan = {
      scope: "global",
      roots: ROOTS,
      rows: [
        {
          target: "config",
          scope: "global",
          action: "none",
          detail: "~/.config/pragma/config.json — present",
          selected: false,
          outcome: { status: "noop", note: "unchanged" },
        },
      ],
    };
    expect(setupFormatters.plain(converged)).toBe(renderRecap(converged));
    expect(setupFormatters.plain(converged)).toContain(
      "✓ config  ~/.config/pragma/config.json — present — unchanged",
    );
  });

  it("a failed row carries the failure glyph and its remedy", () => {
    const failed: PlanRow = {
      target: "lsp",
      scope: "global",
      action: "install",
      detail: "via code",
      selected: true,
      outcome: {
        status: "failed",
        note: "VS Code refused the VSIX",
        remedy:
          "install manually: code --install-extension ~/.local/share/pragma/lsp/terrazzo-lsp.vsix",
      },
    };
    expect(renderProgressLine(failed, 3)).toBe(
      "✗ lsp  via code — VS Code refused the VSIX",
    );
  });

  it("an unapplied plan does not paint every llm row with a check", () => {
    // `GLYPHS[status ?? "noop"]` gave a plan with no outcomes a green ✓ on
    // every row, skips included.
    const out = setupFormatters.llm(PLAN);
    expect(out).not.toContain("✓");
    expect(out).toContain("· **lsp** (global): skip");
  });
});

describe("the machine-readable projections carry the same rows", () => {
  it("json is the plan round-tripped, scope and all", () => {
    expect(JSON.parse(setupFormatters.json(APPLIED))).toEqual(APPLIED);
    // The type-layer rename reaches the machine surface too: the model is
    // emitted verbatim, so the retired word cannot survive as a JSON key.
    expect(setupFormatters.json(APPLIED)).not.toMatch(/\bbands?\b/);
  });

  it("llm names every row with its scope and state", () => {
    const out = setupFormatters.llm(APPLIED);
    for (const row of APPLIED.rows) {
      expect(out).toContain(`**${row.target}** (${row.scope})`);
    }
  });
});

describe("shortenPath — containment, on the host's own separator", () => {
  // The rule is `node:path`'s: a root contains a path when the relative route
  // between them walks only downwards. Hard-coding `/` answered no for every
  // Windows path `node:path` produces, so a plan that had just named both roots
  // in its header printed 120-character absolute rows underneath them. The
  // win32 arm follows from `relative`/`sep` rather than from a second rule, so
  // what is pinned here are the invariants the host separator makes visible.
  const roots = {
    global: join(sep, "home", "u"),
    project: join(sep, "home", "u", "src", "app"),
  };

  it("renders under the project root first — the more specific one", () => {
    expect(shortenPath(join(roots.project, "a", "b.json"), roots)).toBe(
      `.${sep}${join("a", "b.json")}`,
    );
    expect(shortenPath(roots.project, roots)).toBe(".");
  });

  it("renders a global-scope path under `~`", () => {
    expect(shortenPath(join(roots.global, ".config", "x.json"), roots)).toBe(
      `~${sep}${join(".config", "x.json")}`,
    );
    expect(shortenPath(roots.global, roots)).toBe("~");
  });

  it("does not take a sibling that merely EXTENDS a root's name as inside it", () => {
    // `<project>-backup` is not under `<project>`; it is under the home root,
    // and that is the root it must be rendered against.
    expect(shortenPath(join(`${roots.project}-backup`, "a.json"), roots)).toBe(
      `~${sep}${join("src", "app-backup", "a.json")}`,
    );
    // A sibling of the OUTERMOST root is under neither, so it stays absolute.
    const outside = join(`${roots.global}-backup`, "a.json");
    expect(shortenPath(outside, roots)).toBe(outside);
  });

  it("leaves a path under neither root absolute", () => {
    const outside = join(sep, "etc", "pragma", "config.json");
    expect(shortenPath(outside, roots)).toBe(outside);
  });
});
