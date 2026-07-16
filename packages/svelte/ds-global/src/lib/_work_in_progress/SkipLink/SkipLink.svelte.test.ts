import type { Locator } from "@vitest/browser/context";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./SkipLink.svelte";

describe("SkipLink component", () => {
  it("renders with default text if no children are provided", async () => {
    const page = render(Component);
    await expect
      .element(componentLocator(page))
      .toHaveTextContent("Skip to main content");
  });

  it("renders custom children", async () => {
    const page = render(Component, {
      children: createRawSnippet(() => ({
        render: () => "<span>Go to main</span>",
      })),
    });
    await expect
      .element(componentLocator(page))
      .toHaveTextContent("Go to main");
  });

  it("sets href to #main by default", async () => {
    const page = render(Component);
    await expect
      .element(componentLocator(page))
      .toHaveAttribute("href", "#main");
  });

  it("sets href to a custom mainId", async () => {
    const page = render(Component, { mainId: "content" });
    await expect
      .element(componentLocator(page))
      .toHaveAttribute("href", "#content");
  });

  it("uses tabindex 0 by default", async () => {
    const page = render(Component);
    await expect
      .element(componentLocator(page))
      .toHaveAttribute("tabindex", "0");
  });

  it("renders as an anchor element", () => {
    const page = render(Component);
    expect(componentLocator(page).element().tagName).toBe("A");
  });

  it("is keyboard focusable", () => {
    const page = render(Component);
    const skipLink = componentLocator(page).element();

    skipLink.focus();

    expect(document.activeElement).toBe(skipLink);
  });
});

// Note: Prefer role/semantics-oriented ways of selecting elements (e.g., by role, label, etc.) not only for component roots but for all elements to enhance accessibility and maintainability.
// To select the component's root element, use one of the available [Locators](https://vitest.dev/guide/browser/locators.html).
function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("link");
}
