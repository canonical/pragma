import {
  hideColumn,
  moveColumn,
  showColumn,
} from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import type { DataTableColumn } from "../../types.js";
import listColumnSettings from "./listColumnSettings.js";

/** Every ordering of a list. */
const listPermutations = (
  ids: readonly string[],
): readonly (readonly string[])[] =>
  ids.length === 0
    ? [[]]
    : ids.flatMap((id) =>
        listPermutations(ids.filter((other) => other !== id)).map((rest) => [
          id,
          ...rest,
        ]),
      );

describe("listColumnSettings", () => {
  it("offers exactly the changes the core's commands would make, over every declaration, order and hidden set of three columns", () => {
    const ids = ["a", "b", "c"];
    let checked = 0;
    for (let unhideable = 0; unhideable < 8; unhideable += 1) {
      const columns: readonly DataTableColumn[] = ids.map((id, at) => ({
        id,
        header: id,
        hideable: (unhideable & (1 << at)) === 0,
      }));
      for (const order of listPermutations(ids)) {
        for (let hiddenSet = 0; hiddenSet < 8; hiddenSet += 1) {
          const presentation = {
            "table.order": [...order],
            "table.hidden": ids.filter(
              (_, at) => (hiddenSet & (1 << at)) !== 0,
            ),
          };
          for (const { column, offers } of listColumnSettings(
            columns,
            presentation,
            [],
          )) {
            const config = { columns, presentation, id: column.id };
            expect(
              offers,
              `${column.id} over ${JSON.stringify(presentation)}`,
            ).toEqual({
              hide: hideColumn(config) !== null,
              show: showColumn(config) !== null,
              "move-left": moveColumn({ ...config, offset: -1 }) !== null,
              "move-right": moveColumn({ ...config, offset: 1 }) !== null,
            });
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(8 * 6 * 8 * 3);
  });

  it("keeps a column's offers object while its changes hold, and gives a new one when they change", () => {
    const columns: readonly DataTableColumn[] = [
      { id: "a", header: "A" },
      { id: "b", header: "B" },
      { id: "c", header: "C" },
    ];
    const before = listColumnSettings(columns, {}, []);
    // Widths change nothing a column takes.
    const widened = listColumnSettings(
      columns,
      { "table.width.a": 200 },
      before,
    );
    expect(widened.map(({ offers }) => offers)).toEqual(
      before.map(({ offers }) => offers),
    );
    for (const [at, { offers }] of widened.entries()) {
      expect(offers).toBe(before.at(at)?.offers);
    }
    // Hiding the last column changes its own and the middle one's offers,
    // and leaves the first's alone.
    const hidden = listColumnSettings(
      columns,
      { "table.hidden": ["c"] },
      before,
    );
    expect(hidden.at(0)?.offers).toBe(before.at(0)?.offers);
    expect(hidden.at(1)?.offers).not.toBe(before.at(1)?.offers);
    expect(hidden.at(2)?.offers).not.toBe(before.at(2)?.offers);
  });
});
