/** Two solved track lists say the same thing when every track does. */

import type { ColumnToSize } from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import areTracksEqual from "./areTracksEqual.js";

describe("areTracksEqual", () => {
  const track: ColumnToSize = {
    id: "name",
    sizing: { kind: "flex", weight: 1, minPx: 96 },
  };

  it("ignores the array's identity", () => {
    expect(areTracksEqual([track], [{ ...track }])).toBe(true);
  });

  it("sees a track added, renamed or resized", () => {
    expect(areTracksEqual([track], [])).toBe(false);
    expect(areTracksEqual([track], [{ ...track, id: "status" }])).toBe(false);
    expect(
      areTracksEqual(
        [track],
        [{ ...track, sizing: { kind: "fixed", px: 200 } }],
      ),
    ).toBe(false);
  });
});
