import { describe, expect, it } from "vitest";
import createColumnLayout from "./createColumnLayout.js";
import createGridInteraction from "./createGridInteraction.js";
import type { ColumnToSize } from "./types.js";

const columns = (): readonly ColumnToSize[] => [
  { id: "name", sizing: { kind: "flex", weight: 2, minPx: 100, maxPx: 400 } },
  { id: "status", sizing: { kind: "fixed", px: 120 } },
];

const harness = (declared: readonly ColumnToSize[] = columns()) => {
  const layout = createColumnLayout(declared);
  const interaction = createGridInteraction(layout);
  const detach = interaction.observe();
  return { layout, interaction, detach };
};

describe("createGridInteraction", () => {
  it("hands its state out read-only at runtime", () => {
    const { interaction } = harness();
    expect(Object.isFrozen(interaction.state)).toBe(true);
    expect(interaction.state).not.toHaveProperty("set");
  });

  it("starts idle and enters resizing with a captured start width", () => {
    const { interaction } = harness();
    expect(interaction.state.get()).toEqual({ status: "idle" });
    interaction.startResize("name", 500, 100);
    expect(interaction.state.get()).toEqual({
      status: "resizing",
      columnId: "name",
      originX: 500,
      startWidth: 100,
      previewWidth: 100,
    });
  });

  it("clamps the preview to the column's declared bounds", () => {
    const { interaction } = harness();
    interaction.startResize("name", 500, 100);
    interaction.preview(900);
    // start 100 + (900 - 500) = 500, clamped to maxPx 400.
    const state = interaction.state.get();
    if (state.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(state.previewWidth).toBe(400);
    interaction.preview(0);
    // start 100 + (0 - 500) = -400, clamped to minPx 100.
    const after = interaction.state.get();
    if (after.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(after.previewWidth).toBe(100);
  });

  it("publishes nothing for a preview landing on the width in force", () => {
    const { interaction } = harness();
    const seen: number[] = [];
    const release = interaction.observe();
    interaction.state.subscribe(() => {
      const state = interaction.state.get();
      seen.push(state.status === "resizing" ? state.previewWidth : -1);
    });
    interaction.startResize("name", 500, 100);
    interaction.preview(900);
    // Both land past the column's 400px maximum, so the second clamps to the
    // width already in force and nothing redraws.
    interaction.preview(1200);
    interaction.preview(700);
    expect(seen).toEqual([100, 400, 300]);
    release();
  });

  it("commits a fixed override at the clamped preview width", () => {
    const { layout, interaction } = harness();
    interaction.startResize("name", 500, 100);
    interaction.preview(650);
    interaction.commit();
    expect(interaction.state.get()).toEqual({ status: "idle" });
    expect(layout.effective("name")).toEqual({
      kind: "fixed",
      px: 250,
    });
  });

  it("leaves the authoritative layout untouched on cancel", () => {
    const { layout, interaction } = harness();
    interaction.startResize("name", 500, 100);
    interaction.preview(650);
    interaction.cancel();
    expect(interaction.state.get()).toEqual({ status: "idle" });
    expect(layout.effective("name")).toEqual({
      kind: "flex",
      weight: 2,
      minPx: 100,
      maxPx: 400,
    });
  });

  it("ignores previews outside a resize", () => {
    const { interaction } = harness();
    interaction.preview(999);
    expect(interaction.state.get()).toEqual({ status: "idle" });
  });

  it("ignores commit outside a resize", () => {
    const { layout, interaction } = harness();
    interaction.commit();
    expect(layout.state.get().overrides).toEqual({});
  });

  it("invalidates the live preview on an external change to the same column", () => {
    const { layout, interaction } = harness();
    interaction.startResize("name", 500, 100);
    interaction.preview(600);
    // Another actor fixes the same column mid-resize.
    layout.setOverride("name", { kind: "fixed", px: 260 });
    expect(interaction.state.get()).toEqual({ status: "idle" });
  });

  it("ignores external changes to unrelated columns", () => {
    const { layout, interaction } = harness();
    interaction.startResize("name", 500, 100);
    layout.setOverride("status", { kind: "fixed", px: 140 });
    // ColumnLayout changes are per-record: a change to status does not
    // touch the resizing column, so the preview survives.
    const state = interaction.state.get();
    if (state.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(state.columnId).toBe("name");
  });

  it("clamps a fixed column at zero only", () => {
    const { interaction } = harness();
    interaction.startResize("status", 500, 120);
    interaction.preview(900);
    // A fixed column declares no bounds: 120 + (900 - 500) = 520 stands.
    const wide = interaction.state.get();
    if (wide.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(wide.previewWidth).toBe(520);
    interaction.preview(0);
    // 120 + (0 - 500) = -380, floored at zero.
    const narrow = interaction.state.get();
    if (narrow.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(narrow.previewWidth).toBe(0);
  });

  it("clamps an unbounded flex column at its minimum only", () => {
    const { interaction } = harness([
      { id: "notes", sizing: { kind: "flex", weight: 1, minPx: 80 } },
    ]);
    interaction.startResize("notes", 500, 80);
    interaction.preview(1500);
    // No maxPx: 80 + (1500 - 500) = 1080 stands.
    const wide = interaction.state.get();
    if (wide.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(wide.previewWidth).toBe(1080);
    interaction.preview(0);
    // 80 + (0 - 500) = -420, clamped to minPx 80.
    const narrow = interaction.state.get();
    if (narrow.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(narrow.previewWidth).toBe(80);
  });

  it("invalidates the preview when a fixed column's pixels change externally", () => {
    const { layout, interaction } = harness();
    interaction.startResize("status", 500, 120);
    interaction.preview(600);
    // Same kind on both sides: the pixel comparison is what invalidates.
    layout.setOverride("status", { kind: "fixed", px: 200 });
    expect(interaction.state.get()).toEqual({ status: "idle" });
  });

  it("ignores an external write that restates a fixed column's pixels", () => {
    const { layout, interaction } = harness();
    interaction.startResize("status", 500, 120);
    interaction.preview(600);
    layout.setOverride("status", { kind: "fixed", px: 120 });
    const state = interaction.state.get();
    if (state.status !== "resizing") {
      throw new Error("expected resizing");
    }
    expect(state.columnId).toBe("status");
  });

  it("ignores cancel outside a resize", () => {
    const { interaction } = harness();
    interaction.cancel();
    expect(interaction.state.get()).toEqual({ status: "idle" });
  });

  it("unsubscribes from previews", () => {
    const { interaction } = harness();
    let notifications = 0;
    const unsubscribe = interaction.state.subscribe(() => {
      notifications += 1;
    });
    interaction.startResize("name", 500, 100);
    unsubscribe();
    interaction.preview(600);
    expect(notifications).toBe(1);
  });

  it("stops watching the layout once the observation detaches", () => {
    const { layout, interaction, detach } = harness();
    detach();
    interaction.startResize("name", 500, 100);
    expect(interaction.state.get().status).toBe("resizing");
    layout.setOverride("name", { kind: "fixed", px: 260 });
    // Nothing is watching: the preview stays.
    expect(interaction.state.get().status).toBe("resizing");
  });

  it("watches nothing until it is asked to", () => {
    const layout = createColumnLayout(columns());
    const interaction = createGridInteraction(layout);
    interaction.startResize("name", 500, 100);
    layout.setOverride("name", { kind: "fixed", px: 260 });
    // An unattached interaction — a discarded render's, or a server
    // render's — never subscribed, so nothing invalidates and nothing leaks.
    expect(interaction.state.get().status).toBe("resizing");
  });

  it("publishes on each preview", () => {
    const { interaction } = harness();
    let notifications = 0;
    interaction.state.subscribe(() => {
      notifications += 1;
    });
    interaction.startResize("name", 500, 100);
    interaction.preview(600);
    interaction.preview(610);
    expect(notifications).toBe(3);
  });
});
