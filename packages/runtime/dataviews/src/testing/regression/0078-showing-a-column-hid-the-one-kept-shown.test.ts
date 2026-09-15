/**
 * Regression: showing a column hid another, the one a hidden list naming
 * every column had kept shown.
 *
 * Before the fix, when every column a table declares was stored as hidden,
 * the arrangement kept the first one shown, but its id stayed in the list.
 * Showing any other column took only that column's id out, so the first
 * column, still listed, was hidden the moment another was shown. Two tables
 * over one presentation reach this without any link: one hides a column the
 * other declares. Showing a column now also takes out the id of a hideable
 * column the arrangement was keeping shown.
 */

import { describe, expect, it } from "vitest";
import {
  createPresentation,
  hideColumn,
  resolveColumnArrangement,
  showColumn,
} from "../../lib/presentation/index.js";

describe("regression 0078 — showing a column hid the one kept shown", () => {
  it("keeps a column shown when another table's hide left it shown only by the fallback", () => {
    const presentation = createPresentation();
    const first = [{ id: "a" }, { id: "b" }];
    const second = [{ id: "b" }, { id: "c" }];
    /** Apply one command's change, where it makes one. */
    const apply = (patch: ReturnType<typeof hideColumn>): void => {
      if (patch !== null) {
        presentation.arrange(patch);
      }
    };
    /** The ids a table shows over the presentation, in order. */
    const listShown = (columns: readonly { readonly id: string }[]) =>
      resolveColumnArrangement(columns, presentation.state.get().presentation)
        .filter(({ hidden }) => !hidden)
        .map(({ column }) => column.id);
    apply(
      hideColumn({
        columns: second,
        presentation: presentation.state.get().presentation,
        id: "c",
      }),
    );
    apply(
      hideColumn({
        columns: first,
        presentation: presentation.state.get().presentation,
        id: "b",
      }),
    );
    // The second table's list names both its columns; b is kept shown.
    expect(listShown(second)).toEqual(["b"]);
    apply(
      showColumn({
        columns: second,
        presentation: presentation.state.get().presentation,
        id: "c",
      }),
    );
    expect(listShown(second)).toEqual(["b", "c"]);
  });
});
