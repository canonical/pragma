/**
 * Too loose a reading and a real column edit never reaches the table; too
 * tight and every render re-mints the layout. Each case is one fact the
 * model reading must carry, or deliberately must not.
 */
import { describe, expect, it } from "vitest";
import areColumnModelsEqual from "./areColumnModelsEqual.js";
import type { DataTableColumn } from "./types.js";

const name: DataTableColumn = { id: "name", header: "Name" };
const status: DataTableColumn = { id: "status", header: "Status" };

describe("areColumnModelsEqual", () => {
  it("ignores the array's identity", () => {
    expect(
      areColumnModelsEqual([name, status], [{ ...name }, { ...status }]),
    ).toBe(true);
  });

  it("sees a column added or removed", () => {
    expect(areColumnModelsEqual([name], [name, status])).toBe(false);
  });

  it("sees a renamed column", () => {
    expect(areColumnModelsEqual([name], [{ ...name, id: "machine" }])).toBe(
      false,
    );
  });

  it("sees the observed field change, defaulted or declared", () => {
    expect(areColumnModelsEqual([name], [{ ...name, field: "name" }])).toBe(
      true,
    );
    expect(areColumnModelsEqual([name], [{ ...name, field: "title" }])).toBe(
      false,
    );
    expect(
      areColumnModelsEqual(
        [{ ...name, field: "title" }],
        [{ ...name, field: "label" }],
      ),
    ).toBe(false);
  });

  it("sees declared sizing change, against the default too", () => {
    expect(
      areColumnModelsEqual(
        [name],
        [{ ...name, sizing: { kind: "fixed", px: 40 } }],
      ),
    ).toBe(false);
    expect(
      areColumnModelsEqual(
        [{ ...name, sizing: { kind: "flex", weight: 1, minPx: 96 } }],
        [name],
      ),
    ).toBe(true);
  });

  it("ignores everything the rendered tree alone reads", () => {
    expect(
      areColumnModelsEqual(
        [name],
        [{ ...name, header: "Machine name", sortable: true }],
      ),
    ).toBe(true);
  });
});
