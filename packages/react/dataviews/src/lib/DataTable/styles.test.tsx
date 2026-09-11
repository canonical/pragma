/**
 * The stylesheet's contract with the markup. jsdom applies no CSS, so what is
 * pinned is what a stylesheet change can break with every render still
 * green: each class the sheet styles is one the table renders, nothing below
 * the table carries a style of its own, and the declarations whose loss no
 * render would show are still declared.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CompletionResult } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataTable from "./DataTable.js";
import type { DataTableColumn } from "./types.js";

// Comments and the layer name dropped, so neither prose nor `ds.components`
// is ever taken for a class selector.
const sheet = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "styles.css"),
  "utf8",
)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/@layer[^{;]*/g, "");

const schema = createSchema([
  { field: "status", kind: "choices", options: ["running", "failed"] },
]);

type Machine = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
};

const columns: readonly DataTableColumn[] = [
  { id: "name", header: "Name", sortable: true, resizable: true },
  { id: "status", header: "Status" },
];

/** Render a selectable table and settle its first request with `result`. */
const settled = (result: CompletionResult<Machine>): HTMLElement => {
  const provider = createDataViewsProvider<typeof schema.fields, Machine>({
    schema,
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
    provider.complete(requestId, result);
    provider.selection.add(["m-1"]);
  });
  return container;
};

const loaded = (): HTMLElement =>
  settled({
    status: "success",
    rows: [
      { id: "m-1", name: "alpha", status: "running" },
      { id: "m-2", name: "beta", status: "failed" },
    ],
    count: 2,
  });

const failed = (): HTMLElement =>
  settled({ status: "failure", reason: "unreachable" });

const classesOf = (container: HTMLElement): Set<string> =>
  new Set(
    [...container.querySelectorAll("[class]")].flatMap((element) => [
      ...element.classList,
    ]),
  );

describe("DataTable stylesheet", () => {
  it("styles only classes the table renders", () => {
    const styled = new Set(
      [...sheet.matchAll(/\.([a-z][\w-]*)/g)].map(([, name]) => name),
    );
    const rendered = classesOf(loaded());
    cleanup();
    for (const name of classesOf(failed())) {
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
      ".ds.data-table-column-header > .sort > .label",
      ".ds.data-table-column-header > .label",
      ".ds.data-table-column-header > .ds.data-table-resize",
      ".ds.data-table-column-header.selection",
      ".ds.data-table-row-group.header > .ds.data-table-row",
      ".ds.data-table-row-group.body > .ds.data-table-row.selected",
      ".ds.data-table-row > .ds.data-table-cell.selection",
    ]) {
      expect(container.querySelector(selector), selector).not.toBeNull();
    }
    cleanup();
    expect(
      failed().querySelector(
        ".ds.data-table-row-group.body > .ds.data-table-row.status > .ds.data-table-cell.status.error",
      ),
    ).not.toBeNull();
  });

  it("leaves every width to the stylesheet and the one published track list", () => {
    // The container's own publication is pinned in DataTable.test.tsx; no
    // element inside it may carry a style of its own.
    for (const mount of [loaded, failed]) {
      const table = mount().querySelector('[role="table"]');
      expect(table).not.toBeNull();
      expect(table?.querySelectorAll("[style]")).toHaveLength(0);
      cleanup();
    }
  });

  it("keeps a resize drag from starting a text selection", () => {
    // A selection left by one drag turns the next press on the control into
    // a native drag of the selected text, and the column stops resizing.
    const resize = sheet.match(/\.ds\.data-table-resize\s*\{([^{}]*)/)?.[1];
    expect(resize).toMatch(/user-select:\s*none;/);
    expect(resize).toMatch(/touch-action:\s*none;/);
  });
});
