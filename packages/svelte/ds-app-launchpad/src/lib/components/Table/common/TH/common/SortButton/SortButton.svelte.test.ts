/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import type { THContext } from "../../types.js";
import Component from "./SortButton.svelte";

vi.mock("../../context.js", () => {
  return {
    getTHContext: (): THContext => ({
      sortDirection: undefined,
    }),
  };
});

describe("SortButton component", () => {
  const baseProps = {
    "aria-label": "Sort",
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toBeInTheDocument();
  });

  describe("attributes", () => {
    it.each([["id", "test-id"]])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(componentLocator(page))
        .toHaveStyle({ color: "orange" });
    });
  });

  it("renders as link when href is provided", async () => {
    const page = render(Component, {
      ...baseProps,
      href: "https://example.com",
    });
    await expect
      .element(page.getByRole("link", { name: "Sort" }))
      .toHaveAttribute("href", "https://example.com");
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("button", { name: "Sort" });
}
