/**
 * The keys decide whether a caller's rebuilt column array is a change. Too
 * loose and a real column edit never reaches the table; too tight and every
 * render re-mints the layout and re-renders every cell. Each case
 * below is one fact the keys must carry, or deliberately must not.
 */
import type { ColumnToSize } from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import {
  boundsOf,
  sameColumnModel,
  sameColumns,
  sameTracks,
  sizingOf,
} from "./columnKeys.js";
import type { DataTableColumn } from "./types.js";

const name: DataTableColumn = { id: "name", header: "Name" };
const status: DataTableColumn = { id: "status", header: "Status" };

describe("sizingOf", () => {
  it("defaults a column that declares no sizing", () => {
    expect(sizingOf(name)).toEqual({ kind: "flex", weight: 1, minPx: 96 });
    expect(sizingOf({ ...name, sizing: { kind: "fixed", px: 40 } })).toEqual({
      kind: "fixed",
      px: 40,
    });
  });
});

describe("boundsOf", () => {
  it("holds a flexible column to its declared minimum and maximum", () => {
    expect(
      boundsOf({ kind: "flex", weight: 1, minPx: 120, maxPx: 240 }),
    ).toEqual({ min: 120, max: 240 });
  });

  it("leaves a flexible column without a maximum unbounded above", () => {
    expect(boundsOf({ kind: "flex", weight: 1, minPx: 120 })).toEqual({
      min: 120,
      max: Number.POSITIVE_INFINITY,
    });
    // The default sizing is flexible too, with its 96px minimum.
    expect(boundsOf(sizingOf(name))).toEqual({
      min: 96,
      max: Number.POSITIVE_INFINITY,
    });
  });

  it("lets a fixed column go anywhere from zero", () => {
    expect(boundsOf({ kind: "fixed", px: 80 })).toEqual({
      min: 0,
      max: Number.POSITIVE_INFINITY,
    });
  });
});

describe("sameColumnModel", () => {
  it("ignores the array's identity", () => {
    expect(sameColumnModel([name, status], [{ ...name }, { ...status }])).toBe(
      true,
    );
  });

  it("sees a column added or removed", () => {
    expect(sameColumnModel([name], [name, status])).toBe(false);
  });

  it("sees a renamed column", () => {
    expect(sameColumnModel([name], [{ ...name, id: "machine" }])).toBe(false);
  });

  it("sees the observed field change, defaulted or declared", () => {
    expect(sameColumnModel([name], [{ ...name, field: "name" }])).toBe(true);
    expect(sameColumnModel([name], [{ ...name, field: "title" }])).toBe(false);
    expect(
      sameColumnModel(
        [{ ...name, field: "title" }],
        [{ ...name, field: "label" }],
      ),
    ).toBe(false);
  });

  it("sees declared sizing change, against the default too", () => {
    expect(
      sameColumnModel([name], [{ ...name, sizing: { kind: "fixed", px: 40 } }]),
    ).toBe(false);
    expect(
      sameColumnModel(
        [{ ...name, sizing: { kind: "flex", weight: 1, minPx: 96 } }],
        [name],
      ),
    ).toBe(true);
  });

  it("ignores everything the rendered tree alone reads", () => {
    expect(
      sameColumnModel(
        [name],
        [{ ...name, header: "Machine name", sortable: true }],
      ),
    ).toBe(true);
  });
});

describe("sameColumns", () => {
  it("carries the model", () => {
    expect(sameColumns([name], [{ ...name, id: "machine" }])).toBe(false);
  });

  it("sees sorting and resizing offered or withdrawn", () => {
    expect(sameColumns([name], [{ ...name, sortable: true }])).toBe(false);
    expect(sameColumns([name], [{ ...name, resizable: true }])).toBe(false);
  });

  it("compares the header and the renderer by reference", () => {
    const cell = () => null;
    expect(sameColumns([name], [{ ...name }])).toBe(true);
    expect(sameColumns([name], [{ ...name, header: "Machine" }])).toBe(false);
    expect(sameColumns([{ ...name, cell }], [{ ...name, cell }])).toBe(true);
    expect(
      sameColumns([{ ...name, cell }], [{ ...name, cell: () => null }]),
    ).toBe(false);
  });
});

describe("sameTracks", () => {
  const track: ColumnToSize = {
    id: "name",
    sizing: { kind: "flex", weight: 1, minPx: 96 },
  };

  it("ignores the array's identity", () => {
    expect(sameTracks([track], [{ ...track }])).toBe(true);
  });

  it("sees a track added, renamed or resized", () => {
    expect(sameTracks([track], [])).toBe(false);
    expect(sameTracks([track], [{ ...track, id: "status" }])).toBe(false);
    expect(
      sameTracks([track], [{ ...track, sizing: { kind: "fixed", px: 200 } }]),
    ).toBe(false);
  });
});
