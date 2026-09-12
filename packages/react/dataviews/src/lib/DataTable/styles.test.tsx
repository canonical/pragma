/**
 * The stylesheet's contract with the markup. jsdom applies no CSS, so what is
 * pinned is what a stylesheet change can break with every render still
 * green: each class the sheet styles is one the table renders, nothing below
 * the table carries a style of its own but a windowed table's gaps, which
 * carry their height alone, and the declarations whose loss no render would
 * show are still declared.
 *
 * The anatomy beside the code states the DOM each part renders; the same
 * renders pin that it still does. This reads the anatomy's notes, not its
 * structure: it is no validator.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Completion, SortTerm } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  COUNTED_EXACTLY,
  declaring,
  delivered,
  exact,
  sorting,
} from "../capabilities.fixtures.js";
import virtualRows from "../virtualization/virtualRows.js";
import DataTable from "./DataTable.js";
import type { DataTableColumn } from "./types.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/** A file beside this one, as text. */
const read = (file: string): string =>
  readFileSync(path.join(here, file), "utf8");

// Comments and the layer name dropped, so neither prose nor `ds.components`
// is ever taken for a class selector.
const sheet = read("styles.css")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/@layer[^{;]*/g, "");

/**
 * The declarations of the first rule whose selector list is exactly
 * `selector`: anchored at a rule's start, so a longer selector ending the
 * same way never answers for it.
 */
const rule = (selector: RegExp): string => {
  const body = sheet.match(
    new RegExp(`(?:^|[;{}])\\s*${selector.source}\\s*\\{([^{}]*)`),
  )?.[1];
  if (body === undefined) {
    throw new Error(`no rule for ${selector.source}`);
  }
  return body;
};

const schema = createSchema([
  { field: "status", kind: "choices", options: ["running", "failed"] },
]);

type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
};

/** What the fixture source declares: it can order by `name`, which the table sorts. */
const capabilities = declaring({
  filter: { status: ["eq"] },
  sort: sorting(["name"], 1),
  counts: COUNTED_EXACTLY,
});

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true, resizable: true },
  { id: "status", header: "Status" },
];

/**
 * Render a selectable table and settle its first request with `completion`,
 * then, given a `sort`, settle the ordered query with the same answer.
 */
const settled = (
  completion: Completion<Machine>,
  sort?: SortTerm,
): HTMLElement => {
  const provider = createDataViewsProvider<typeof schema.fields, Machine>({
    schema,
    capabilities,
  });
  const { container } = render(
    <DataTable
      provider={provider}
      columns={columns}
      label="Machines"
      selectable
    />,
  );
  const requestId = provider.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  act(() => {
    provider.complete(requestId, completion);
    provider.selection.add(["m-1"]);
  });
  if (sort !== undefined) {
    act(() => {
      provider.setSort([sort]);
    });
    const ordered = provider.state.get().pendingRequestId;
    if (ordered === null) {
      throw new Error("expected the sort to issue a request");
    }
    act(() => {
      provider.complete(ordered, completion);
    });
  }
  return container;
};

const loaded = (): HTMLElement =>
  settled(
    delivered([
      { id: "m-1", name: "alpha", status: "running" },
      { id: "m-2", name: "beta", status: "failed" },
    ]),
    { field: "name", direction: "asc" },
  );

const failed = (): HTMLElement =>
  settled({
    status: "failed",
    failure: {
      reason: "unreachable",
      cause: new Error("unreachable"),
      transient: null,
    },
  });

/** Rows that still answer the query, under a refresh that failed. */
const refreshFailed = (): HTMLElement => {
  const provider = createDataViewsProvider<typeof schema.fields, Machine>({
    schema,
    capabilities,
  });
  const { container } = render(
    <DataTable provider={provider} columns={columns} label="Machines" />,
  );
  const first = provider.refresh();
  if (first === null) {
    throw new Error("expected a refresh request");
  }
  act(() => {
    provider.complete(
      first,
      delivered([{ id: "m-1", name: "alpha", status: "running" }]),
    );
  });
  const again = provider.refresh();
  if (again === null) {
    throw new Error("expected the refresh to issue a request");
  }
  act(() => {
    provider.complete(again, {
      status: "failed",
      failure: {
        reason: "unreachable",
        cause: new Error("unreachable"),
        transient: null,
      },
    });
  });
  return container;
};

/** A windowed table over more rows than it mounts, so it holds a gap. */
const windowedTable = (): HTMLElement => {
  const provider = createDataViewsProvider<typeof schema.fields, Machine>({
    schema,
    capabilities,
  });
  const { container } = render(
    <DataTable
      provider={provider}
      columns={columns}
      label="Machines"
      windowing={virtualRows({ estimatedRowHeight: 32 })}
    />,
  );
  const requestId = provider.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  const rows = Array.from({ length: 20 }, (_, position) => ({
    id: `m-${position}`,
    name: `host-${position}`,
    status: "running",
  }));
  act(() => {
    provider.complete(requestId, delivered(rows));
  });
  return container;
};

const classesOf = (container: HTMLElement): Set<string> =>
  new Set(
    [...container.querySelectorAll("[class]")].flatMap((element) => [
      ...element.classList,
    ]),
  );

describe("DataTable stylesheet", () => {
  it("colours both failures with the error token and nothing else", () => {
    // The one thing a render cannot show: a status that lost its colour
    // still reads as a status. Both failures carry it; a stale or empty
    // table is muted, because nothing went wrong there.
    expect(rule(/\.ds\.data-table-body-cell\.status/)).toMatch(
      /color:\s*var\(--color-text-muted\)/,
    );
    // Nested inside that rule, so it is read from the sheet rather than
    // through `rule`, which stops at the first nested block.
    const failures = sheet.match(
      /&\.failed,\s*&\.refresh-failed\s*\{([^{}]*)\}/,
    );
    if (failures === null) {
      throw new Error("no rule colours the two failure statuses together");
    }
    expect(failures[1]).toMatch(/color:\s*var\(--color-text-error\)/);
  });

  it("styles only classes the table renders", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name]) => name),
    );
    const rendered = classesOf(loaded());
    cleanup();
    for (const name of classesOf(failed())) {
      rendered.add(name);
    }
    cleanup();
    for (const name of classesOf(refreshFailed())) {
      rendered.add(name);
    }
    expect(styled.size).toBeGreaterThan(0);
    expect([...styled].filter((name) => !rendered.has(name))).toEqual([]);
  });

  it("renders the structure the stylesheet's combinators assume", () => {
    // Every class appearing somewhere is not enough: the sheet reaches most
    // of them through a parent, and a class that moves loses its rule.
    const container = loaded();
    for (const selector of [
      ".ds.data-table-header-cell > .sort > .label",
      ".ds.data-table-header-cell > .sort > .ds.icon",
      ".ds.data-table-header-cell > .label",
      ".ds.data-table-header-cell > .ds.data-table-resize-handle",
      ".ds.data-table-header-cell.selection",
      ".ds.data-table > .ds.data-table-row-group.header > .ds.data-table-row > .ds.data-table-header-cell.selection",
      ".ds.data-table-row-group.header > .ds.data-table-row",
      ".ds.data-table-row-group.body > .ds.data-table-row.selected",
      ".ds.data-table-row > .ds.data-table-body-cell.selection",
      // A data cell, not only the selection and status cells sharing its
      // class: its ellipsis and padding live on this class.
      ".ds.data-table-row-group.body > .ds.data-table-row > .ds.data-table-body-cell:not(.selection)",
    ]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
    cleanup();
    expect(
      failed().querySelector(
        ".ds.data-table-row-group.body > .ds.data-table-row.status > .ds.data-table-body-cell.status.failed",
      ),
    ).not.toBeNull();
  });

  it("leaves every width to the stylesheet and the one published track list", () => {
    // The container's own publication is pinned in DataTable.test.tsx; no
    // element inside it may carry a style of its own but a windowed table's
    // gaps, each the height of the rows it stands for and nothing else.
    for (const mount of [loaded, failed, windowedTable]) {
      const table = mount().querySelector('[role="table"]');
      expect(table).not.toBeNull();
      if (mount === windowedTable) {
        expect(table?.querySelector(".ds.data-table-gap")).not.toBeNull();
      }
      for (const styled of table?.querySelectorAll<HTMLElement>("[style]") ??
        []) {
        expect(styled).toHaveClass("data-table-gap");
        expect(
          Array.from({ length: styled.style.length }, (_, position) =>
            styled.style.item(position),
          ),
        ).toEqual(["block-size"]);
      }
      cleanup();
    }
  });

  it("sizes row groups by their tracks' minimums, never by their cells", () => {
    expect(rule(/\.ds\.data-table-row-group/)).toMatch(
      /min-inline-size:\s*min-content;/,
    );
    expect(sheet).not.toMatch(/max-content/);
  });

  it("writes no length or colour of its own", () => {
    // Every value is a token, a channel or a structural keyword: a missing
    // token is recorded in the anatomy, never written here as a number.
    expect(sheet).not.toMatch(/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|opacity/i);
  });

  it("paints the surface it sits on", () => {
    expect(rule(/\.ds\.data-table/)).toMatch(
      /background-color:\s*var\(--surface-color-background,\s*var\(--color-background\)\);/,
    );
  });

  it("reads the density channel and defines no density rule of its own", () => {
    const table = loaded().querySelector('[role="table"]');
    expect(table).toHaveClass("dense");
    expect(sheet).not.toMatch(/\.dense\b/);
    // A minimum, so a taller cell grows its row rather than clipping.
    expect(rule(/\.ds\.data-table-row/)).toMatch(
      /min-block-size:\s*var\(--density-line-height-effective\);/,
    );
    const cells = rule(
      /\.ds\.data-table-body-cell,\s*\.ds\.data-table-header-cell/,
    );
    expect(cells).toMatch(/padding-inline:\s*var\(--density-padding-inline\);/);
    // The row's height is the density line's alone: no cell adds to it.
    expect(cells).not.toMatch(/padding-block/);
    expect(sheet).not.toMatch(/--typography-[\w-]*line-height/);
  });

  it("owns the selection track, ahead of the solved ones", () => {
    expect(
      rule(
        /\.ds\.data-table:has\(\s*>\s*\.ds\.data-table-row-group\.header\s*>\s*\.ds\.data-table-row\s*>\s*\.ds\.data-table-header-cell\.selection\s*\)\s*>\s*\.ds\.data-table-row-group\s*>\s*\.ds\.data-table-row/,
      ),
    ).toMatch(
      /grid-template-columns:\s*var\(--dimension-400\)\s+var\(--data-table-columns,\)\s+\[actions\];/,
    );
  });

  it("spans the status row across the table, however many tracks it has", () => {
    // A block, so even a selectable table with no columns gives its message
    // the full width rather than the selection track alone.
    expect(rule(/\.ds\.data-table-row\.status/)).toMatch(/display:\s*block;/);
  });

  it("names the line an actions column will follow", () => {
    // The empty fallback keeps the selectable template valid for a table
    // with no columns, which publishes no track list at all.
    expect(rule(/\.ds\.data-table-row/)).toMatch(
      /grid-template-columns:\s*var\(--data-table-columns,\)\s+\[actions\];/,
    );
  });

  it("stretches each header cell to the row, and never shrinks its chevron", () => {
    // The resize target at a header cell's edge is as tall as the row.
    expect(rule(/\.ds\.data-table-header-cell/)).toMatch(
      /align-self:\s*stretch;/,
    );
    expect(sheet.match(/& > \.ds\.icon\s*\{([^{}]*)/)?.[1]).toMatch(
      /flex:\s*none;/,
    );
  });

  it("keeps a resize drag from starting a text selection", () => {
    // A selection left by one drag turns the next press on the control into
    // a native drag of the selected text, and the column stops resizing.
    const resize = rule(/\.ds\.data-table-resize-handle/);
    expect(resize).toMatch(/user-select:\s*none;/);
    expect(resize).toMatch(/touch-action:\s*none;/);
  });

  it("marks the resize target with the design's hairline, centred", () => {
    const mark = sheet.match(
      /\.ds\.data-table-resize-handle\s*\{[^}]*?&::after\s*\{([^{}]*)/,
    )?.[1];
    expect(mark).toMatch(
      /inline-size:\s*var\(--dimension-stroke-thickness-large\);/,
    );
    expect(mark).toMatch(/block-size:\s*var\(--dimension-250\);/);
    expect(mark).toMatch(/inset:\s*0;/);
    expect(mark).toMatch(/margin:\s*auto;/);
    expect(rule(/\.ds\.data-table-resize-handle/)).toMatch(
      /inline-size:\s*var\(--dimension-200\);/,
    );
  });
});

/** Each anatomy file, beside the component implementing its root node. */
const anatomies = [
  ["DataTable.anatomy.yaml", "DataTable.tsx"],
  [
    "common/HeaderCell/HeaderCell.anatomy.yaml",
    "common/HeaderCell/HeaderCell.tsx",
  ],
  ["common/BodyCell/BodyCell.anatomy.yaml", "common/BodyCell/BodyCell.tsx"],
] as const;

/**
 * An anatomy note's DOM as a selector: a class list (`ds data-table-row
 * status`, placeholders like `<kind>` dropped) or a selector already
 * (`button.sort`).
 */
const selectorOf = (dom: string): string =>
  dom.includes(" ")
    ? dom
        .split(" ")
        .filter((name) => !name.startsWith("<"))
        .map((name) => `.${name}`)
        .join("")
    : dom;

describe("DataTable anatomy", () => {
  it("is implemented by the component beside it", () => {
    for (const [anatomy, component] of anatomies) {
      const uri = read(anatomy).match(/^node:\n\s+uri: (\S+)$/m)?.[1] ?? "";
      expect(uri, anatomy).not.toBe("");
      // Anchored, so a longer IRI with the same prefix does not answer.
      expect(read(component), component).toMatch(
        new RegExp(`@implements ds:${uri.replaceAll(".", "\\.")}(?![\\w.-])`),
      );
    }
  });

  it("states only DOM the table renders", () => {
    const stated = new Set(
      anatomies.flatMap(([anatomy]) =>
        [...read(anatomy).matchAll(/DOM `([^`]+)`/g)].map(([, dom]) =>
          selectorOf(dom),
        ),
      ),
    );
    expect(stated.size).toBeGreaterThan(0);
    for (const mount of [loaded, failed, windowedTable]) {
      const container = mount();
      for (const selector of [...stated]) {
        if (container.querySelector(selector) !== null) {
          stated.delete(selector);
        }
      }
      cleanup();
    }
    expect([...stated]).toEqual([]);
  });
});
