/**
 * The announcer: one polite region, there before it speaks, that speaks what
 * arrives together as one announcement, the same words said twice read
 * twice, and nothing once it has gone.
 */

import { act, render } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Announcer from "./Announcer.js";
import { CLEAR_DELAY_MS, COALESCE_DELAY_MS } from "./constants.js";
import type { AnnouncerHandle, AnnouncerTopic } from "./types.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** The announcer mounted, with the way to speak and to read its region. */
const mount = (strict = false) => {
  const handle = createRef<AnnouncerHandle>();
  const announcer = <Announcer ref={handle} />;
  const view = render(
    strict ? <StrictMode>{announcer}</StrictMode> : announcer,
  );
  const say = (...messages: readonly string[]) => {
    act(() => {
      for (const message of messages) {
        handle.current?.announce(message);
      }
    });
  };
  const sayUnder = (message: string, topic: AnnouncerTopic) => {
    act(() => {
      handle.current?.announce(message, topic);
    });
  };
  const wait = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };
  /** Each announcement the region holds, as its text. */
  const listSaid = (): readonly string[] =>
    Array.from(
      view.container.querySelectorAll(".ds.data-views-announcer > *"),
      (node) => node.textContent ?? "",
    );
  return { view, say, sayUnder, wait, listSaid };
};

describe("Announcer", () => {
  it("is a polite region of additions, there before it speaks, saying nothing yet", () => {
    const { view, listSaid } = mount();
    const region = view.container.querySelector(".ds.data-views-announcer");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-relevant", "additions");
    expect(region).not.toHaveAttribute("role");
    expect(region).toBeEmptyDOMElement();
    expect(listSaid()).toEqual([]);
  });

  it("waits a moment before speaking, so the region never speaks a half-said moment", () => {
    const { say, wait, listSaid } = mount();
    say("Status hidden");
    expect(listSaid()).toEqual([]);
    wait(COALESCE_DELAY_MS - 1);
    expect(listSaid()).toEqual([]);
    wait(1);
    expect(listSaid()).toEqual(["Status hidden"]);
  });

  it("speaks what arrives together as one announcement, in the order it was said", () => {
    const { say, wait, listSaid } = mount();
    say("Sort unchanged: busy.");
    wait(COALESCE_DELAY_MS / 2);
    say("Status hidden", "Table settings reset");
    wait(COALESCE_DELAY_MS / 2);
    expect(listSaid()).toEqual([
      "Sort unchanged: busy. Status hidden Table settings reset",
    ]);
    // What arrives after the wait ended starts a wait of its own.
    say("Cores moved to position 1 of 3");
    wait(COALESCE_DELAY_MS);
    expect(listSaid()).toEqual([
      "Sort unchanged: busy. Status hidden Table settings reset",
      "Cores moved to position 1 of 3",
    ]);
  });

  it("replaces what stood under a topic, and keeps what stands under none", () => {
    const { say, sayUnder, wait, listSaid } = mount();
    say("Status hidden");
    sayUnder("Sorted by Name, ascending.", "ordering");
    sayUnder("Sorted by Name, ascending; then Cores, descending.", "ordering");
    wait(COALESCE_DELAY_MS);
    expect(listSaid()).toEqual([
      "Status hidden Sorted by Name, ascending; then Cores, descending.",
    ]);
    // A later moment says its own ordering, whatever the last one was.
    sayUnder("Not sorted: the source documents no order.", "ordering");
    wait(COALESCE_DELAY_MS);
    expect(listSaid().at(-1)).toBe(
      "Not sorted: the source documents no order.",
    );
  });

  it("says the same words once in one moment, and again in the next", () => {
    const { say, wait, listSaid } = mount();
    say("Sort unchanged: this source orders by at most 1 term.");
    say("Sort unchanged: this source orders by at most 1 term.");
    wait(COALESCE_DELAY_MS);
    expect(listSaid()).toEqual([
      "Sort unchanged: this source orders by at most 1 term.",
    ]);
    say("Sort unchanged: this source orders by at most 1 term.");
    wait(COALESCE_DELAY_MS);
    expect(listSaid()).toHaveLength(2);
  });

  it("speaks the same words again as a new announcement, never altering them", () => {
    const { view, say, wait, listSaid } = mount();
    say("Table settings reset");
    wait(COALESCE_DELAY_MS);
    const first = view.container.querySelector(".ds.data-views-announcer > *");
    say("Table settings reset");
    wait(COALESCE_DELAY_MS);
    expect(listSaid()).toEqual([
      "Table settings reset",
      "Table settings reset",
    ]);
    // The first is untouched: the second is a node added beside it, which a
    // live region of additions reads.
    const nodes = view.container.querySelectorAll(
      ".ds.data-views-announcer > *",
    );
    expect(nodes.item(0)).toBe(first);
    expect(nodes.item(1)).not.toBe(first);
    expect(nodes.item(1).textContent).toBe("Table settings reset");
  });

  it("clears each announcement a while after it was spoken, its own and no other", () => {
    const { say, wait, listSaid } = mount();
    say("Status hidden");
    wait(COALESCE_DELAY_MS);
    wait(CLEAR_DELAY_MS / 2);
    say("Status shown, position 2 of 3");
    wait(COALESCE_DELAY_MS);
    expect(listSaid()).toHaveLength(2);
    wait(CLEAR_DELAY_MS / 2 - COALESCE_DELAY_MS);
    expect(listSaid()).toEqual(["Status shown, position 2 of 3"]);
    wait(CLEAR_DELAY_MS);
    expect(listSaid()).toEqual([]);
  });

  it("speaks a node as it is given, not only text", () => {
    const handle = createRef<AnnouncerHandle>();
    const { container } = render(<Announcer ref={handle} />);
    act(() => {
      handle.current?.announce(
        <>
          <abbr title="Central processing units">CPUs</abbr> hidden
        </>,
      );
      vi.advanceTimersByTime(COALESCE_DELAY_MS);
    });
    expect(
      container.querySelector(".ds.data-views-announcer abbr"),
    ).toHaveTextContent("CPUs");
  });

  it("speaks the same node twice in one moment, since two nodes cannot be compared", () => {
    const handle = createRef<AnnouncerHandle>();
    const { container } = render(<Announcer ref={handle} />);
    const hidden = <abbr title="Central processing units">CPUs</abbr>;
    act(() => {
      handle.current?.announce(hidden);
      handle.current?.announce(hidden);
      vi.advanceTimersByTime(COALESCE_DELAY_MS);
    });
    // Only words are compared: a message carrying elements is spoken as
    // often as it is said, which is the honest reading of two commands that
    // each said it.
    expect(
      container.querySelectorAll(".ds.data-views-announcer abbr"),
    ).toHaveLength(2);
  });

  it("drops what was waiting and schedules nothing once unmounted", () => {
    const { view, say } = mount();
    say("Status hidden");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    view.unmount();
    act(() => {
      vi.advanceTimersByTime(COALESCE_DELAY_MS + CLEAR_DELAY_MS);
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("clears a spoken announcement's timer on unmount too", () => {
    const { view, say, wait } = mount();
    say("Status hidden");
    wait(COALESCE_DELAY_MS);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves one region that still speaks after StrictMode's rehearsal mount", () => {
    const { view, say, wait, listSaid } = mount(true);
    expect(
      view.container.querySelectorAll(".ds.data-views-announcer"),
    ).toHaveLength(1);
    say("Status hidden");
    wait(COALESCE_DELAY_MS);
    expect(listSaid()).toEqual(["Status hidden"]);
  });
});
