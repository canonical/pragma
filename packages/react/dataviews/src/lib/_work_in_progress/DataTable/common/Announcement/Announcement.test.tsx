/**
 * The table's announcement: a polite region there before it speaks, saying
 * what each change to the columns did in the column's own words, the same
 * words said twice read twice.
 */

import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import Announcement from "./Announcement.js";
import { REPEAT_MARK } from "./constants.js";
import type { AnnouncementHandle } from "./types.js";

const column = { id: "status", header: "Status" } as const;

/** The announcement mounted, with its handle and its region. */
const mount = () => {
  const handle = createRef<AnnouncementHandle>();
  const { container } = render(<Announcement ref={handle} />);
  const region = container.querySelector(".ds.data-table-announcement");
  const say = (subject: Parameters<AnnouncementHandle["announce"]>[0]) => {
    act(() => {
      handle.current?.announce(subject);
    });
  };
  return { region, say };
};

describe("Announcement", () => {
  it("is a polite region there before it speaks, saying nothing yet", () => {
    const { region } = mount();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toBeEmptyDOMElement();
  });

  it("says each change in the column's own words", () => {
    const { region, say } = mount();
    const said: string[] = [];
    for (const subject of [
      { kind: "hidden", column },
      { kind: "always-shown", column },
      { kind: "shown", column, position: 2, count: 3 },
      { kind: "moved", column, position: 1, count: 3 },
      { kind: "reset" },
    ] as const) {
      say(subject);
      said.push(region?.textContent?.replace(REPEAT_MARK, "") ?? "");
    }
    expect(said).toEqual([
      "Status hidden",
      "Status is always shown",
      "Status shown, position 2 of 3",
      "Status moved to position 1 of 3",
      "Table settings reset",
    ]);
  });

  it("changes its text when the same words are said again, so they are read again", () => {
    const { region, say } = mount();
    say({ kind: "reset" });
    const first = region?.textContent;
    say({ kind: "reset" });
    expect(region?.textContent).not.toBe(first);
    expect(region?.textContent).toBe(`Table settings reset${REPEAT_MARK}`);
    say({ kind: "reset" });
    expect(region?.textContent).toBe(first);
  });
});
