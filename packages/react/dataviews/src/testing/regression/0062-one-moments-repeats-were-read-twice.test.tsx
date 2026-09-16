/**
 * Regression: what one moment repeated is read once.
 *
 * Before the fix every message said in a moment was added to the region, so
 * two parts of one root saying the same words in the same moment — a command
 * and the outcome it met — had the reader hear them twice over, in one
 * breath. The same words said twice in one moment are spoken once; the same
 * words said again in a later moment are spoken again, since each moment is
 * a new node and a live region of additions reads it.
 */

import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Announcer,
  type AnnouncerHandle,
  COALESCE_DELAY_MS,
} from "../../lib/common/index.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const HIDDEN = "Status hidden";

describe("regression 0062 — one moment's repeats were read twice", () => {
  it("speaks repeated words once in the moment, and again in the next", () => {
    const handle = createRef<AnnouncerHandle>();
    const { container } = render(<Announcer ref={handle} />);
    /** Each announcement the region holds, as its text. */
    const listSaid = (): readonly string[] =>
      Array.from(
        container.querySelectorAll(".ds.data-views-announcer > *"),
        (announcement) => announcement.textContent ?? "",
      );

    act(() => {
      handle.current?.announce(HIDDEN);
      handle.current?.announce(HIDDEN);
      vi.advanceTimersByTime(COALESCE_DELAY_MS);
    });
    // One announcement, holding the words once — not "Status hidden Status
    // hidden", which is what a reader heard before the fix.
    expect(listSaid()).toEqual([HIDDEN]);

    act(() => {
      handle.current?.announce(HIDDEN);
      vi.advanceTimersByTime(COALESCE_DELAY_MS);
    });
    expect(listSaid()).toEqual([HIDDEN, HIDDEN]);
  });
});
