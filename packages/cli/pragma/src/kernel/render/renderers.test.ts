import { describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import { cliRecovery } from "../error/recovery.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "../error/renderError.js";
import type { ColumnDef, LookupField, SectionDef } from "./contracts.js";
import { resolveDetail } from "./disclosure.js";
import {
  renderListLlm,
  renderListPlain,
  renderLookupLlm,
  renderLookupPlain,
} from "./renderers.js";
import { type RenderStyle, styleFor } from "./style.js";

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

  it("renders an empty-state message (+ hint) when items are empty", () => {
    const options = {
      heading: "Widgets",
      columns: columnsFor("summary"),
      emptyMessage: "No widget entries found.",
      emptyHint: "Run `pragma sources update`.",
    };
    // Plain: message then hint on the next line — a non-blank exit-0 body.
    expect(renderListPlain([], options)).toBe(
      "No widget entries found.\nRun `pragma sources update`.",
    );
    // Llm: the `(0)` heading, then the same message + hint.
    expect(renderListLlm([], options)).toBe(
      "## Widgets (0)\n\nNo widget entries found.\nRun `pragma sources update`.",
    );
  });

  it("keeps the bare-empty behavior when no emptyMessage is declared", () => {
    const options = { heading: "Widgets", columns: columnsFor("summary") };
    expect(renderListPlain([], options)).toBe("");
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
      recovery: cliRecovery("pragma block list", "List available blocks."),
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
