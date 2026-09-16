/**
 * The sweep that proves no part speaks English of its own is only worth its
 * green when it would go red: these are its controls. It reports the
 * record's words where a page speaks them, leaves the application's own data
 * alone, and leaves alone what a story authored itself.
 */

import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import findEnglish from "../../../testing/findEnglish.js";

const english = resolveMessages();

/** A detached element holding `html`, as the sweep reads a rendered page. */
const hold = (html: string): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

describe("findEnglish", () => {
  it("reports the record's own words where a page speaks them", () => {
    const found = findEnglish(hold(`<p>${english.sortAbsent}</p>`), english);
    expect(found).not.toEqual([]);
    expect(found.join(" ")).toContain(english.sortAbsent);
  });

  it("reports them from an attribute a reader hears, not only from text", () => {
    expect(
      findEnglish(
        hold(`<button aria-label="${english.sortAbsent}"></button>`),
        english,
      ),
    ).not.toEqual([]);
  });

  it("leaves the application's own data alone, wherever it happens to match", () => {
    expect(
      findEnglish(
        hold(`<div role="cell">${english.sortAbsent}</div>`),
        english,
      ),
    ).toEqual([]);
  });

  it("leaves alone a phrase the page's own author wrote", () => {
    expect(
      findEnglish(
        hold(`<p>${english.sortAbsent}</p>`),
        english,
        new Set([english.sortAbsent]),
      ),
    ).toEqual([]);
  });

  it("reads a replacement's token as naming a message, not as words", () => {
    // The brackets hold a message of the record word for word: read as text
    // it is English, read as a token it names what was replaced.
    expect(
      findEnglish(hold(`<p>‹${english.sortAbsent}›</p>`), english),
    ).toEqual([]);
  });
});
