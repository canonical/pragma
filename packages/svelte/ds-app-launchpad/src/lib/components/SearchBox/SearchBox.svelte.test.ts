/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./SearchBox.svelte";

const baseProps = {
  "aria-label": "Search articles",
  "data-testid": "search-box",
} satisfies ComponentProps<typeof Component>;

describe("SearchBox component", () => {
  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toBeVisible();
  });

  it("applies classes", async () => {
    const page = render(Component, { ...baseProps, class: "test-class" });
    await expect.element(componentLocator(page)).toHaveClass("test-class");
    await expect.element(componentLocator(page)).toHaveClass("ds");
    await expect.element(componentLocator(page)).toHaveClass("search-box");
  });

  describe("basics", () => {
    it("doesn't throw", async () => {
      expect(() => {
        render(Component, { ...baseProps });
      }).not.toThrow();
    });

    it("renders wrapper, input and button", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(wrapperLocator(page)).toBeInTheDocument();
      await expect.element(inputLocator(page)).toBeInTheDocument();
      await expect.element(buttonLocator(page)).toBeInTheDocument();
    });
  });

  describe("input attributes", () => {
    it.each([
      ["name", "test-name"],
      ["placeholder", "test-placeholder"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, {
        ...baseProps,
        [attribute]: expected,
      });
      await expect
        .element(inputLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies style", async () => {
      const page = render(Component, { style: "color: orange;", ...baseProps });
      await expect.element(inputLocator(page)).toHaveStyle({ color: "orange" });
    });

    it("can be required", async () => {
      const page = render(Component, {
        ...baseProps,
        required: true,
      });
      await expect.element(inputLocator(page)).toBeRequired();
    });

    it("applies value", async () => {
      const page = render(Component, {
        ...baseProps,
        value: "test-value",
      });
      await expect.element(inputLocator(page)).toHaveValue("test-value");
    });
  });

  describe("button and input", () => {
    it("are not disabled by default", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(inputLocator(page)).toBeEnabled();
      await expect.element(buttonLocator(page)).toBeEnabled();
    });

    it("can be disabled", async () => {
      const page = render(Component, { ...baseProps, disabled: true });
      await expect.element(inputLocator(page)).toBeDisabled();
      await expect.element(buttonLocator(page)).toBeDisabled();
    });

    it("share the same accessible name", async () => {
      const label = "test-label";
      const page = render(Component, { ...baseProps, "aria-label": label });
      await expect
        .element(page.getByRole("searchbox", { name: label }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: label }))
        .toBeInTheDocument();
    });

    it("calls onSearchButtonClick when the button is clicked", async () => {
      const onSearchButtonClick = vi.fn();
      const page = render(Component, {
        ...baseProps,
        onSearchButtonClick,
      });
      await buttonLocator(page).click();
      expect(onSearchButtonClick).toHaveBeenCalled();
    });
  });
});

// Note: Prefer role/semantics-oriented ways of selecting elements (e.g., by role, label, etc.) not only for component roots but for all elements to enhance accessibility and maintainability.
// To select the component's root element, use one of the available [Locators](https://vitest.dev/guide/browser/locators.html).
function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("search-box");
}

function wrapperLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("search-box");
}

function inputLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("searchbox", { name: "Search articles" });
}

function buttonLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("button", { name: "Search articles" });
}
