import type { Locator } from "@vitest/browser/context";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./SkipLink.svelte";

describe("SkipLink component", () => {
  describe("behavior", () => {
    let mainEl: HTMLElement;

    beforeEach(() => {
      mainEl = document.createElement("main");
      mainEl.tabIndex = -1;
      document.body.appendChild(mainEl);
    });

    afterEach(() => {
      mainEl.remove();
    });

    it("moves focus to the main element when activated", async () => {
      mainEl.id = "main";
      const page = render(Component);
      await componentLocator(page).click();
      expect(document.activeElement).toBe(mainEl);
    });

    it("moves focus to a custom main element when mainId is set", async () => {
      mainEl.id = "custom-content";
      const page = render(Component, { mainId: "custom-content" });
      await componentLocator(page).click();
      expect(document.activeElement).toBe(mainEl);
    });
  });
});

// Note: Prefer role/semantics-oriented ways of selecting elements (e.g., by role, label, etc.) not only for component roots but for all elements to enhance accessibility and maintainability.
// To select the component's root element, use one of the available [Locators](https://vitest.dev/guide/browser/locators.html).
function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("link");
}
