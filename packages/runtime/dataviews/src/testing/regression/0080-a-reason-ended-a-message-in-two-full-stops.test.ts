/**
 * Regression: a reason that already ends in a full stop does not end a
 * message in two.
 *
 * A store, a source or the schema may end its reason with a stop or leave
 * it a fragment. Before the fix only some messages allowed for that: the
 * saved views' notices, the arrangement's and a failed command's appended
 * a stop whatever came in, so a reason ending in one read "quota..", while
 * the sort's refusal stripped it first.
 */

import { describe, expect, it } from "vitest";
import { resolveMessages } from "../../lib/messages/index.js";

const english = resolveMessages();

describe("regression 0080 — a reason ended a message in two full stops", () => {
  it("ends every reason with one stop, however the reason arrived", () => {
    for (const reason of ["quota exceeded", "quota exceeded."]) {
      expect(english.viewsUnavailable(reason)).toBe(
        "Saved views are unavailable: quota exceeded.",
      );
      expect(english.arrangementUnsaved(reason)).toBe(
        "The arrangement is not being saved: quota exceeded.",
      );
      expect(english.viewFailed("save", reason)).toBe(
        "Not saved: quota exceeded.",
      );
      expect(english.sortRefused([reason])).toBe(
        "Sort unchanged: quota exceeded.",
      );
      expect(english.viewNameRefused(reason)).toBe("Quota exceeded.");
      expect(english.filterRefused([reason], false)).toBe("Quota exceeded.");
    }
  });

  it("ends a message once however many stops or spaces a reason carried", () => {
    expect(english.statusFailed("offline. ")).toBe(
      "These rows could not be loaded: offline",
    );
    expect(english.sortRefused(["quota exceeded.. "])).toBe(
      "Sort unchanged: quota exceeded.",
    );
  });

  it("leaves a stop inside the reason alone", () => {
    expect(english.viewUnreadable("open", "version 1.2 is unreadable")).toBe(
      "Not opened: the stored view cannot be read (version 1.2 is unreadable).",
    );
  });
});
