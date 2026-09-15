import { describe, expect, it, vi } from "vitest";
import { createStandInPresentationStore } from "../../../testing/createStandInStores.js";
import {
  createPresentation,
  type JsonValue,
  type OwnedPresentation,
  type PresentationStore,
  resolveColumnArrangement,
  spellWidthKey,
} from "../presentation/index.js";
import createColumnLayout from "./createColumnLayout.js";
import type { ColumnToSize } from "./types.js";

const buildColumns = (): readonly ColumnToSize[] => [
  { id: "name", sizing: { kind: "flex", weight: 2, minPx: 120 } },
  { id: "status", sizing: { kind: "fixed", px: 120 } },
  { id: "zone", sizing: { kind: "flex", weight: 1, minPx: 100, maxPx: 300 } },
];

/** A layout over a presentation kept in memory, with that presentation. */
const createLayoutOver = (
  presentation: OwnedPresentation = createPresentation(),
) => ({
  presentation,
  layout: createColumnLayout({ columns: buildColumns(), presentation }),
});

describe("createColumnLayout", () => {
  it("hands its state out read-only at runtime", () => {
    const { layout } = createLayoutOver();
    expect(Object.keys(layout.state)).toEqual(["get", "subscribe"]);
    expect(layout.state).not.toHaveProperty("set");
  });

  it("declares sizing per column and rejects empty or duplicate ids", () => {
    const { layout } = createLayoutOver();
    expect(layout.effective("name")).toEqual({
      kind: "flex",
      weight: 2,
      minPx: 120,
    });
    expect(layout.effective("status")).toEqual({ kind: "fixed", px: 120 });
    const presentation = createPresentation();
    expect(() =>
      createColumnLayout({
        columns: [{ id: "", sizing: { kind: "fixed", px: 1 } }],
        presentation,
      }),
    ).toThrow("must not be empty");
    expect(() =>
      createColumnLayout({
        columns: [
          { id: "name", sizing: { kind: "fixed", px: 1 } },
          { id: "name", sizing: { kind: "fixed", px: 2 } },
        ],
        presentation,
      }),
    ).toThrow("duplicate");
    // The prototype chain is not a member.
    expect(() => layout.effective("toString")).toThrow("unknown column id");
    expect(() => layout.readDeclared("toString")).toThrow("unknown column id");
    expect(layout.readDeclared("status")).toEqual({ kind: "fixed", px: 120 });
  });

  it("derives fixed overrides from the presentation's widths, held to the declared bounds", () => {
    const { presentation, layout } = createLayoutOver();
    presentation.arrange({
      [spellWidthKey("name")]: 340,
      [spellWidthKey("zone")]: 900,
      [spellWidthKey("status")]: 40,
    });
    expect(layout.effective("name")).toEqual({ kind: "fixed", px: 340 });
    // A flexible column is held to its declared maximum, a fixed one goes
    // anywhere from zero.
    expect(layout.effective("zone")).toEqual({ kind: "fixed", px: 300 });
    expect(layout.effective("status")).toEqual({ kind: "fixed", px: 40 });
    presentation.arrange({ [spellWidthKey("name")]: 10 });
    expect(layout.effective("name")).toEqual({ kind: "fixed", px: 120 });
  });

  it("keeps the declared sizing where the presentation holds no usable width", () => {
    const { presentation, layout } = createLayoutOver();
    presentation.arrange({
      [spellWidthKey("name")]: -5,
      [spellWidthKey("status")]: Number.NaN,
      [spellWidthKey("zone")]: "wide",
      "table.width.other": 200,
    });
    expect(layout.state.get().overrides).toEqual({});
    for (const column of buildColumns()) {
      expect(layout.effective(column.id)).toEqual(column.sizing);
    }
  });

  it("writes an override to the presentation, so every layout over it agrees", () => {
    const { presentation, layout } = createLayoutOver();
    const other = createColumnLayout({ columns: buildColumns(), presentation });
    layout.setOverride("name", { kind: "fixed", px: 340 });
    expect(presentation.state.get().presentation).toEqual({
      [spellWidthKey("name")]: 340,
    });
    expect(other.effective("name")).toEqual({ kind: "fixed", px: 340 });
    expect(other.state.get()).toBe(other.state.get());
  });

  it("rejects overrides for unknown columns", () => {
    const { layout } = createLayoutOver();
    expect(() =>
      layout.setOverride("toString", { kind: "fixed", px: 10 }),
    ).toThrow("unknown column id");
    expect(() =>
      layout.setOverride("zone2", { kind: "fixed", px: 10 }),
    ).toThrow("unknown column id");
  });

  it("writes nothing for an override the presentation already implies", () => {
    const patchPresentation = vi.fn<PresentationStore["patchPresentation"]>(
      async () => ({ status: "saved" }),
    );
    const presentation = createPresentation({
      store: createStandInPresentationStore({ patchPresentation }),
    });
    const layout = createColumnLayout({
      columns: buildColumns(),
      presentation,
    });
    let release = presentation.observe();
    layout.setOverride("name", { kind: "fixed", px: 340 });
    // The release writes the first; the same width again, in a new
    // observation, would be a second write if the layout let it through.
    release();
    release = presentation.observe();
    layout.setOverride("name", { kind: "fixed", px: 340 });
    release();
    expect(patchPresentation.mock.calls).toEqual([
      ["default", { [spellWidthKey("name")]: 340 }],
    ]);
  });

  it("publishes a snapshot only on an actual change, to every subscriber", () => {
    const { presentation, layout } = createLayoutOver();
    const heard: string[] = [];
    const stopFirst = layout.state.subscribe(() => {
      heard.push("first");
    });
    layout.state.subscribe(() => {
      heard.push("second");
    });
    const before = layout.state.get();
    layout.setOverride("name", { kind: "fixed", px: 340 });
    expect(heard).toEqual(["first", "second"]);
    expect(layout.state.get()).not.toBe(before);
    // A presentation change that moves no width of these columns is silent,
    // and the snapshot keeps its identity.
    const after = layout.state.get();
    presentation.arrange({ "table.order": ["zone"] });
    expect(heard).toHaveLength(2);
    expect(layout.state.get()).toBe(after);
    stopFirst();
    layout.setOverride("name", { kind: "fixed", px: 341 });
    expect(heard).toEqual(["first", "second", "second"]);
  });

  it("keeps the declared sizing immune to caller mutations", () => {
    const input = buildColumns();
    const presentation = createPresentation();
    const layout = createColumnLayout({ columns: input, presentation });
    (input as { id: string; sizing: unknown }[]).push({
      id: "sneaky",
      sizing: { kind: "fixed", px: 1 },
    });
    expect(() => layout.effective("sneaky")).toThrow("unknown column id");
    // A width stored for the column pushed later is nobody's: the layout
    // derives over the ids it copied, so it neither throws nor applies it.
    presentation.arrange({ [spellWidthKey("sneaky")]: 200 });
    expect(layout.state.get().overrides).toEqual({});
  });

  it("applies exactly the widths the arrangement resolver reads", () => {
    // What counts as a stored width is decided once, in the resolver: every
    // value it reads as a width the layout applies, and none other.
    const stored: readonly JsonValue[] = [
      120,
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "120",
      true,
      null,
      [120],
      { px: 120 },
    ];
    for (const value of stored) {
      const arrangement = { [spellWidthKey("status")]: value };
      const [resolved] = resolveColumnArrangement(
        [{ id: "status" }],
        arrangement,
      );
      const { presentation, layout } = createLayoutOver();
      presentation.arrange(arrangement);
      expect(layout.effective("status")).toEqual({
        kind: "fixed",
        px: resolved?.width ?? 120,
      });
    }
  });
});
