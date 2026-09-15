import { describe, expect, it } from "vitest";
import createPresentation from "./createPresentation.js";
import hideColumn from "./hideColumn.js";
import resolveColumnArrangement from "./resolveColumnArrangement.js";
import showColumn from "./showColumn.js";
import type { DeclaredColumn, ViewPresentation } from "./types.js";

const columns: readonly DeclaredColumn[] = [
  { id: "name", hideable: false },
  { id: "status" },
  { id: "cores" },
];

/** The ids an arrangement shows, in its order. */
const listShown = (
  declared: readonly DeclaredColumn[],
  presentation: ViewPresentation,
): readonly string[] =>
  resolveColumnArrangement(declared, presentation)
    .filter(({ hidden }) => !hidden)
    .map(({ column }) => column.id);

describe("hideColumn", () => {
  it("adds the column to the hidden list, keeping every id the list held", () => {
    const presentation = { "table.hidden": ["cores", "region", 7] };
    const patch = hideColumn({ columns, presentation, id: "status" });
    // A column another table declares stays hidden there.
    expect(patch).toEqual({ "table.hidden": ["cores", "region", "status"] });
    expect(listShown(columns, { ...presentation, ...patch })).toEqual(["name"]);
  });

  it("changes nothing for an unknown, hidden or unhideable column", () => {
    expect(hideColumn({ columns, presentation: {}, id: "region" })).toBeNull();
    expect(
      hideColumn({
        columns,
        presentation: { "table.hidden": ["cores"] },
        id: "cores",
      }),
    ).toBeNull();
    expect(hideColumn({ columns, presentation: {}, id: "name" })).toBeNull();
  });

  it("never hides the last column shown", () => {
    const hideable: readonly DeclaredColumn[] = [
      { id: "status" },
      { id: "cores" },
    ];
    const presentation = { "table.hidden": ["cores"] };
    expect(
      hideColumn({ columns: hideable, presentation, id: "status" }),
    ).toBeNull();
    // Nor the one a list naming every column leaves shown.
    expect(
      hideColumn({
        columns: hideable,
        presentation: { "table.hidden": ["status", "cores"] },
        id: "status",
      }),
    ).toBeNull();
  });

  it("keeps a column shown and every unhideable column shown across every sequence of hides and shows", () => {
    // Every declaration of three columns, each hideable or not, and every
    // sequence of four commands over them, applied as a presentation would
    // apply each change.
    const ids = ["a", "b", "c"];
    const declarations = [0, 1, 2, 3, 4, 5, 6, 7].map((mask) =>
      ids.map((id, at) => ({ id, hideable: (mask & (1 << at)) === 0 })),
    );
    const commands = ids.flatMap((id) => [
      { kind: "hide", id } as const,
      { kind: "show", id } as const,
    ]);
    const listSequences = (length: number): (typeof commands)[number][][] =>
      length === 0
        ? [[]]
        : listSequences(length - 1).flatMap((sequence) =>
            commands.map((command) => [...sequence, command]),
          );
    let checked = 0;
    for (const declared of declarations) {
      for (const sequence of listSequences(4)) {
        const owned = createPresentation();
        for (const { kind, id } of sequence) {
          const change = kind === "hide" ? hideColumn : showColumn;
          const patch = change({
            columns: declared,
            presentation: owned.state.get().presentation,
            id,
          });
          if (patch !== null) {
            owned.arrange(patch);
          }
          const arranged = resolveColumnArrangement(
            declared,
            owned.state.get().presentation,
          );
          expect(arranged.some(({ hidden }) => !hidden)).toBe(true);
          // What is stored never hides every column it may, so the shown
          // column is the commands' doing, not the resolution's fallback.
          const stored = owned.state.get().presentation["table.hidden"];
          const storedHidden = Array.isArray(stored) ? stored : [];
          expect(
            declared.some(
              (column) =>
                column.hideable === false || !storedHidden.includes(column.id),
            ),
          ).toBe(true);
          for (const { column, hidden } of arranged) {
            if (column.hideable === false) {
              expect(hidden).toBe(false);
            }
          }
          checked += 1;
        }
      }
    }
    expect(checked).toBe(8 * 6 ** 4 * 4);
  });
});
