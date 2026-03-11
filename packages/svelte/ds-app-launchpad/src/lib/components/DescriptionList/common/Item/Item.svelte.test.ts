/* @canonical/generator-ds 0.17.1 */

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import type { DescriptionListContext } from "../../types.js";
import Component from "./Item.svelte";

vi.mock("../../context.js", () => {
  return {
    getDescriptionListContext: (): DescriptionListContext => ({
      layout: "auto",
    }),
  };
});

describe("Item component", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Description</span>`,
    })),
    name: "Term",
    "data-testid": "description-list-item",
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toBeInTheDocument();
    await expect.element(termLocator(page)).toHaveTextContent("Term");
    await expect
      .element(descriptionLocator(page))
      .toHaveTextContent("Description");
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
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
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("description-list-item");
}

function termLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("term");
}

function descriptionLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("definition");
}
