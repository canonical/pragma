import { describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import { cliRecovery } from "../error/recovery.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "../error/renderError.js";
import type {
  ColumnDef,
  LookupField,
  RenderContext,
  SectionDef,
} from "./contracts.js";
import { resolveDetail } from "./disclosure.js";
import {
  MAX_PLAIN_CELL_WIDTH,
  renderListEmptyNotice,
  renderListLlm,
  renderListPlain,
  renderLookupLlm,
  renderLookupPlain,
} from "./renderers.js";
import { type RenderStyle, styleFor } from "./style.js";

/** An interactive stdout with headers on — the default terminal shape. */
const TTY_CONTEXT: RenderContext = { headers: true, stdoutIsTty: true };
/** A piped stdout with headers on — the field-splitting consumer shape. */
const PIPE_CONTEXT: RenderContext = { headers: true, stdoutIsTty: false };

interface Widget {
  readonly uri: string;
  readonly name: string;
  readonly kind: string;
  readonly note: string;
}

const widgets: readonly Widget[] = [
  {
    uri: "https://ds.canonical.com/Button",
    name: "Button",
    kind: "component",
    note: "Primary action",
  },
  {
    uri: "https://ds.canonical.com/Card",
    name: "Card",
    kind: "pattern",
    note: "",
  },
];

/** Columns shown at each disclosure level — mirrors what a domain formatter does. */
function columnsFor(detail: string): ColumnDef<Widget>[] {
  if (detail === "summary") return [{ key: "name", label: "Name" }];
  if (detail === "detailed") {
    return [
      { key: "uri", label: "URI" },
      { key: "name", label: "Name" },
      { key: "kind", label: "Kind" },
      { key: "note", label: "Note" },
    ];
  }
  return [
    { key: "name", label: "Name" },
    { key: "kind", label: "Kind" },
  ];
}

function fieldsFor(detail: string): LookupField<Widget>[] {
  const fields: LookupField<Widget>[] = [
    { label: "Kind", value: (w) => w.kind },
  ];
  if (detail === "detailed") {
    fields.push({ label: "URI", value: (w) => w.uri });
  }
  return fields;
}

function sectionsFor(detail: string): SectionDef<Widget>[] {
  return detail === "detailed"
    ? [{ key: "note", heading: "Note", kind: "field" }]
    : [];
}

const DETAILS = ["summary", "standard", "detailed"] as const;

describe("render matrix (list/lookup/empty × plain/llm/json × detail)", () => {
  it("renders every scenario/format/detail combination", () => {
    const matrix: Record<string, Record<string, Record<string, string>>> = {};

    for (const detail of DETAILS) {
      const columns = columnsFor(detail);
      const listOpts = { heading: "Widgets", columns };
      const lookupOpts = {
        title: (w: Widget) => w.name,
        fields: fieldsFor(detail),
        sections: sectionsFor(detail),
      };
      const projected = widgets.map((w) =>
        Object.fromEntries(columns.map((c) => [c.key, w[c.key]])),
      );

      matrix[detail] = {
        list: {
          plain: renderListPlain(widgets, listOpts),
          llm: renderListLlm(widgets, listOpts),
          json: JSON.stringify(projected),
        },
        lookup: {
          plain: renderLookupPlain(widgets[0] as Widget, lookupOpts),
          llm: renderLookupLlm(widgets[0] as Widget, lookupOpts),
          json: JSON.stringify(widgets[0]),
        },
        empty: {
          plain: renderListPlain([], listOpts),
          llm: renderListLlm([], listOpts),
          json: "[]",
        },
      };
    }

    expect(matrix).toMatchSnapshot();
  });

  it("separates the empty notice (stderr's text) from the stdout rendering", () => {
    const options = {
      heading: "Widgets",
      columns: columnsFor("summary"),
      emptyMessage: "No widget entries found.",
      emptyHint: "Run `pragma sources update`.",
    };
    // The notice is its own render — the dispatcher routes it to stderr so a
    // pipe never receives a human sentence as data.
    expect(renderListEmptyNotice(options)).toBe(
      "No widget entries found.\nRun `pragma sources update`.",
    );
    // Plain stdout for an empty list on a TTY: nothing (the notice suffices).
    expect(renderListPlain([], options, TTY_CONTEXT)).toBe("");
    // Llm keeps its byte-frozen shape: the `(0)` heading, then message + hint.
    expect(renderListLlm([], options)).toBe(
      "## Widgets (0)\n\nNo widget entries found.\nRun `pragma sources update`.",
    );
  });

  it("keeps the bare-empty behavior when no emptyMessage is declared", () => {
    const options = { heading: "Widgets", columns: columnsFor("summary") };
    expect(renderListEmptyNotice(options)).toBe("");
    expect(renderListPlain([], options, TTY_CONTEXT)).toBe("");
    expect(renderListLlm([], options)).toBe("## Widgets (0)\n");
  });

  it("resolves disclosure level from ordered sources", () => {
    expect(resolveDetail({ flag: "detailed", config: "summary" })).toBe(
      "detailed",
    );
    expect(resolveDetail({ config: "summary" })).toBe("summary");
    expect(resolveDetail({ specDefault: "detailed" })).toBe("detailed");
    expect(resolveDetail({})).toBe("standard");
    expect(resolveDetail({ flag: "bogus" })).toBe("standard");
  });
});

describe("plain list table contract (headers, rectangular grid, cell discipline)", () => {
  const columns: ColumnDef<Widget>[] = [
    { key: "name", label: "Name" },
    { key: "kind", label: "Kind" },
    { key: "note", label: "Note" },
  ];
  const options = { heading: "Widgets", columns };

  it("emits a bold-eligible UPPERCASE header row built from the column labels", () => {
    const lines = renderListPlain(widgets, options, TTY_CONTEXT).split("\n");
    expect(lines[0]).toMatch(/^NAME\s+KIND\s+NOTE$/);
    expect(lines).toHaveLength(1 + widgets.length);
  });

  it("suppresses the header row when the context disables headers", () => {
    const lines = renderListPlain(
      widgets,
      options,
      { headers: false, stdoutIsTty: true },
    ).split("\n");
    expect(lines[0]).not.toMatch(/^NAME/);
    expect(lines).toHaveLength(widgets.length);
  });

  it("keeps the grid rectangular — an empty cell renders as -", () => {
    // Card's note is "": the NOTE column is populated on another row, so the
    // grid keeps the column and marks the hole instead of shifting fields.
    const lines = renderListPlain(widgets, options, TTY_CONTEXT).split("\n");
    const cardRow = lines.find((line) => line.startsWith("Card"));
    expect(cardRow?.trim().split(/\s{2,}/)).toEqual(["Card", "pattern", "-"]);
  });

  it("drops a column no row populates (unless it opts into showWhenEmpty)", () => {
    const noteless = widgets.map((w) => ({ ...w, note: "" }));
    const lines = renderListPlain(noteless, options, TTY_CONTEXT).split("\n");
    expect(lines[0]).toMatch(/^NAME\s+KIND$/);
  });

  it("collapses newlines and truncates a long cell with an ellipsis", () => {
    const prose = [
      {
        ...widgets[0],
        note: `first line\nsecond line ${"x".repeat(2 * MAX_PLAIN_CELL_WIDTH)}`,
      },
    ] as Widget[];
    const lines = renderListPlain(prose, options, TTY_CONTEXT).split("\n");
    const row = lines[1] as string;
    expect(row).not.toContain("\n");
    expect(row).toContain("first line second line");
    const noteCell = row.trim().split(/\s{2,}/).at(-1) as string;
    expect(noteCell.length).toBeLessThanOrEqual(MAX_PLAIN_CELL_WIDTH);
    expect(noteCell.endsWith("…")).toBe(true);
  });

  it("renders only the header row for an empty list on a piped stdout", () => {
    // An explicit `--format plain` down a pipe gets a well-formed zero-record
    // table: every declared column, no rows — so `awk` sees a schema.
    expect(renderListPlain([], options, PIPE_CONTEXT)).toMatch(
      /^NAME\s+KIND\s+NOTE$/,
    );
    // With headers off there is nothing to print at all.
    expect(
      renderListPlain([], options, { headers: false, stdoutIsTty: false }),
    ).toBe("");
  });

  it("bolds the header row on a color-capable TTY, leaving cells unstyled", () => {
    const tagged: RenderStyle = {
      enabled: true,
      bold: (t) => `B(${t})`,
      dim: (t) => t,
      cyan: (t) => t,
      green: (t) => t,
      yellow: (t) => t,
    };
    const lines = renderListPlain(widgets, options, TTY_CONTEXT, tagged).split(
      "\n",
    );
    expect(lines[0]).toMatch(/^B\(NAME\s+KIND\s+NOTE\)$/);
    expect(lines[1]).not.toContain("B(");
  });

  it("is byte-identical plain text when the styler is disabled", () => {
    const lines = renderListPlain(
      widgets,
      options,
      TTY_CONTEXT,
      styleFor(false),
    ).split("\n");
    expect(lines[0]).toMatch(/^NAME\s+KIND\s+NOTE$/);
  });
});

describe("lookup beautify (TTY style seam)", () => {
  const lookupOpts = {
    title: (w: Widget) => w.name,
    fields: fieldsFor("standard"),
    sections: sectionsFor("standard"),
  };

  it("bolds the title, dims the rule, and cyans field labels on a TTY", () => {
    const tagged: RenderStyle = {
      enabled: true,
      bold: (t) => `B(${t})`,
      dim: (t) => `D(${t})`,
      cyan: (t) => `C(${t})`,
      green: (t) => t,
      yellow: (t) => t,
    };
    const lines = renderLookupPlain(
      widgets[0] as Widget,
      lookupOpts,
      tagged,
    ).split("\n");
    expect(lines.at(0)).toBe("B(Button)");
    expect(lines.at(1)).toBe(`D(${"═".repeat(24)})`);
    expect(lines).toContain("  C(Kind): component");
  });

  it("is byte-identical to the plain lookup when the styler is disabled", () => {
    expect(
      renderLookupPlain(widgets[0] as Widget, lookupOpts, styleFor(false)),
    ).toBe(`Button\n${"═".repeat(24)}\n\n  Kind: component`);
  });
});

describe("error render matrix (× plain/llm/json)", () => {
  it("renders each error across the three formats", () => {
    const notFound = PragmaError.notFound("block", "Buton", {
      suggestions: ["Button"],
      recovery: cliRecovery("block list", "List available blocks."),
    });
    const empty = PragmaError.emptyResults("token", {
      filters: { channel: "stable", tier: "core" },
      validOptions: ["stable", "beta"],
    });

    expect({
      notFound: {
        plain: renderErrorPlain(notFound),
        llm: renderErrorLlm(notFound),
        json: renderErrorJson(notFound),
      },
      empty: {
        plain: renderErrorPlain(empty),
        llm: renderErrorLlm(empty),
        json: renderErrorJson(empty),
      },
    }).toMatchSnapshot();
  });
});
