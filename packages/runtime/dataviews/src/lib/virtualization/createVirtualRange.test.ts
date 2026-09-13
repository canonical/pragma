import { describe, expect, it, vi } from "vitest";
import { displayEntries } from "../rows/index.js";
import createVirtualRange from "./createVirtualRange.js";

/** Row identities `r-0` to `r-<count - 1>`. */
const rowIds = (count: number, from = 0): string[] =>
  Array.from({ length: count }, (_, position) => `r-${from + position}`);

const records = (ids: readonly string[]) =>
  displayEntries({ rowIds: ids, status: null });

/** A range over a hundred 10px rows; a status row is estimated at 30px. */
const hundredRows = () => {
  const range = createVirtualRange({ estimates: { record: 10, status: 30 } });
  const entries = records(rowIds(100));
  range.setEntries(entries);
  return { range, entries };
};

/** The runs as [start, end, before] triples, and the space after them. */
const shape = (range: ReturnType<typeof hundredRows>["range"]) => ({
  runs: range.get().runs.map((run) => [run.start, run.end, run.before]),
  after: range.get().after,
});

describe("createVirtualRange", () => {
  it("refuses an estimate that is not a positive size", () => {
    for (const estimate of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createVirtualRange({ estimates: { record: estimate, status: 30 } }),
      ).toThrow("record estimate must be a positive finite number");
    }
  });

  it("mounts nothing while there are no entries", () => {
    const range = createVirtualRange({ estimates: { record: 10, status: 30 } });
    range.setViewport(100, 50);
    expect(range.get()).toEqual({ runs: [], after: 0 });
    expect(range.setEntries([])).toBe(0);
    expect(range.get()).toEqual({ runs: [], after: 0 });
  });

  it("mounts the entries in view and a few past each edge", () => {
    const { range } = hundredRows();
    // Nothing in view yet: the overscan alone.
    expect(shape(range)).toEqual({ runs: [[0, 5, 0]], after: 950 });
    range.setViewport(0, 45);
    expect(shape(range)).toEqual({ runs: [[0, 9, 0]], after: 910 });
    range.setViewport(500, 45);
    expect(shape(range)).toEqual({ runs: [[46, 59, 460]], after: 410 });
  });

  it("publishes a scroll only when it changes what is mounted", () => {
    const { range } = hundredRows();
    range.setViewport(500, 45);
    const listener = vi.fn();
    const unsubscribe = range.subscribe(listener);
    range.setViewport(503, 45);
    expect(listener).not.toHaveBeenCalled();
    range.setViewport(520, 45);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    range.setViewport(0, 45);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("takes new entries silently, since whoever sets them renders them", () => {
    const { range } = hundredRows();
    const listener = vi.fn();
    range.subscribe(listener);
    range.setEntries(records(rowIds(3)));
    expect(listener).not.toHaveBeenCalled();
    expect(shape(range)).toEqual({ runs: [[0, 3, 0]], after: 0 });
  });

  it("ignores the entries it already has", () => {
    const { range, entries } = hundredRows();
    range.setViewport(500, 45);
    const before = range.get();
    expect(range.setEntries(entries)).toBe(0);
    expect(range.get()).toBe(before);
  });

  describe("measurement", () => {
    it("scrolls by what an entry above the anchor grew", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      expect(range.measure([["record:r-47", 25]])).toBe(15);
      // The anchor kept its place, so the same entries stay mounted.
      expect(shape(range)).toEqual({ runs: [[46, 59, 460]], after: 410 });
    });

    it("moves nothing on screen for an entry below the anchor", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      const listener = vi.fn();
      range.subscribe(listener);
      expect(
        range.measure([
          ["record:r-55", 20],
          ["record:r-70", 20],
        ]),
      ).toBe(0);
      // The mounted r-55 grew inside its run; only r-70 is space after it.
      expect(shape(range)).toEqual({ runs: [[46, 59, 460]], after: 420 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does nothing for a size it already has or an entry it lacks", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      const listener = vi.fn();
      range.subscribe(listener);
      expect(range.measure([["record:r-50", 10]])).toBe(0);
      expect(range.measure([["record:gone", 40]])).toBe(0);
      expect(listener).not.toHaveBeenCalled();
    });

    it("keeps no anchor at the very top", () => {
      const { range } = hundredRows();
      range.setViewport(0, 45);
      expect(range.measure([["record:r-2", 30]])).toBe(0);
      expect(shape(range)).toEqual({ runs: [[0, 7, 0]], after: 930 });
    });

    it("keeps the measurements of entries that stay", () => {
      const { range } = hundredRows();
      range.measure([["record:r-99", 30]]);
      range.setEntries(records([...rowIds(100), "r-100"]));
      expect(range.get().after).toBe(1010 + 20 - 50);
    });

    it("drops the measurements of entries that leave", () => {
      const { range } = hundredRows();
      range.measure([["record:r-60", 30]]);
      range.setEntries(records(rowIds(100).filter((id) => id !== "r-60")));
      range.setEntries(records(rowIds(100)));
      // Back at its estimate: a kept 30px would leave 970 after the run.
      expect(range.get().after).toBe(950);
    });

    it("keeps a measurement with its entry when the entry moves", () => {
      const { range } = hundredRows();
      range.measure([["record:r-60", 30]]);
      range.setEntries(records([...rowIds(5, 1000), ...rowIds(100)]));
      range.setViewport(700, 45);
      // r-60 now sits at position 65, still 30px: keyed by position, the
      // 30px would have stayed at 60 and moved the run's start to 660.
      expect(shape(range).runs).toEqual([[64, 77, 640]]);
    });
  });

  describe("invalidation", () => {
    it("keeps mounted entries' measurements, which are measured again", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      range.measure([["record:r-55", 20]]);
      expect(range.invalidate("all")).toBe(0);
      // Scrolled back to the top, r-55 still counts its measured 20px.
      range.setViewport(0, 45);
      expect(range.get().after).toBe(920);
    });

    it("forgets unmounted ones and keeps the anchor in place", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      range.measure([["record:r-47", 25]]);
      range.setViewport(815, 45);
      // r-47 is far above the viewport now; forgetting it moves the anchor
      // up by the 15px it had grown, and the scroll with it.
      expect(range.invalidate("all")).toBe(-15);
      expect(range.invalidate("all")).toBe(0);
    });

    it("forgets only the entries named", () => {
      const { range } = hundredRows();
      range.measure([
        ["record:r-80", 20],
        ["record:r-90", 30],
      ]);
      range.setViewport(10, 45);
      expect(
        range.invalidate(["record:r-80", "record:gone", "record:r-70"]),
      ).toBe(0);
      // r-80 is back to its estimate; r-90 keeps its 30px.
      expect(range.get().after).toBe(1020 - 100);
    });

    it("changes nothing for a measurement equal to the estimate", () => {
      const { range } = hundredRows();
      range.measure([["record:r-90", 10]]);
      const listener = vi.fn();
      range.subscribe(listener);
      expect(range.invalidate(["record:r-90"])).toBe(0);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("new entries", () => {
    it("keeps the anchor in place when a status row appears above it", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      const stale = displayEntries({ rowIds: rowIds(100), status: "stale" });
      expect(range.setEntries(stale)).toBe(30);
      // Entry 51 is r-50: the same rows stay mounted under the status row.
      expect(shape(range)).toEqual({ runs: [[47, 60, 490]], after: 410 });
    });

    it("follows the anchor to wherever it moved", () => {
      const { range } = hundredRows();
      range.setViewport(505, 45);
      expect(range.setEntries(records(["new", ...rowIds(100)]))).toBe(10);
      // Reversed, r-50 lands at position 49: 20px earlier than it just was.
      expect(range.setEntries(records(rowIds(100).reverse()))).toBe(-20);
    });

    it("stays put when the anchor left", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      const without = rowIds(100).filter((id) => id !== "r-50");
      expect(range.setEntries(records(without))).toBe(0);
      // The entry now at the viewport's start is the new anchor.
      expect(range.measure([["record:r-49", 20]])).toBe(10);
    });

    it("shows entries added at the very top rather than scrolling past them", () => {
      const { range } = hundredRows();
      range.setViewport(0, 45);
      expect(range.setEntries(records(["new", ...rowIds(100)]))).toBe(0);
    });
  });

  describe("retention", () => {
    it("keeps an entry above the viewport mounted, with its neighbours", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      range.retain("record:r-10");
      expect(shape(range)).toEqual({
        runs: [
          [9, 12, 90],
          [46, 59, 340],
        ],
        after: 410,
      });
    });

    it("keeps an entry below the viewport mounted", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      range.retain("record:r-90");
      expect(shape(range)).toEqual({
        runs: [
          [46, 59, 460],
          [89, 92, 300],
        ],
        after: 80,
      });
    });

    it("joins the runs when the kept entry touches the viewport's", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      for (const [id, run] of [
        ["record:r-58", [46, 60, 460]],
        ["record:r-60", [46, 62, 460]],
        ["record:r-44", [43, 59, 430]],
      ] as const) {
        range.retain(id);
        expect(shape(range).runs).toEqual([run]);
      }
    });

    it("keeps the first and last entries, with the one neighbour each has", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      range.retain("record:r-0");
      expect(shape(range)).toEqual({
        runs: [
          [0, 2, 0],
          [46, 59, 440],
        ],
        after: 410,
      });
      range.retain("record:r-99");
      expect(shape(range)).toEqual({
        runs: [
          [46, 59, 460],
          [98, 100, 390],
        ],
        after: 0,
      });
    });

    it("lets go when asked, or when the entry is not displayed", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      range.retain("record:r-10");
      range.retain(null);
      expect(shape(range).runs).toEqual([[46, 59, 460]]);
      range.retain("record:gone");
      expect(shape(range).runs).toEqual([[46, 59, 460]]);
    });

    it("lets go of an entry that leaves", () => {
      const { range } = hundredRows();
      range.setViewport(500, 45);
      range.retain("record:r-10");
      // One row fewer above the anchor: the viewport follows it up by one.
      range.setEntries(records(rowIds(100).filter((id) => id !== "r-10")));
      expect(shape(range).runs).toEqual([[45, 58, 450]]);
      // Back again, r-10 is not retained any more.
      range.setEntries(records(rowIds(100)));
      expect(shape(range).runs).toEqual([[46, 59, 460]]);
    });
  });

  it("accounts for every measured fraction, and leaves nothing after the last entry", () => {
    const { range } = hundredRows();
    for (let round = 0; round < 50; round += 1) {
      const sizes = rowIds(100).map(
        (id, position) =>
          [`record:${id}`, 10 + ((position * 7 + round) % 13) * 0.2] as const,
      );
      range.measure(sizes);
      const whole = sizes.reduce((total, [, size]) => total + size, 0);
      range.setViewport(whole / 2, 100);
      const [run] = range.get().runs;
      const mounted = sizes
        .slice(run.start, run.end)
        .reduce((total, [, size]) => total + size, 0);
      expect(run.before + mounted + range.get().after).toBeCloseTo(whole, 9);
      range.setViewport(10_000, 100);
      expect(range.get().after).toBe(0);
    }
  });

  it("bounds what it mounts however many entries there are", () => {
    const range = createVirtualRange({ estimates: { record: 32, status: 64 } });
    range.setEntries(records(rowIds(1_000_000)));
    range.setViewport(16_000_000, 640);
    const [run] = range.get().runs;
    expect(run.end - run.start).toBe(20 + 1 + 8);
    expect(run.before + (run.end - run.start) * 32 + range.get().after).toBe(
      32_000_000,
    );
  });
});
