/* @canonical/generator-ds 0.17.1 */

import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Harness from "./test-harness.svelte";
import type { ItemProps } from "./types.js";

describe("Item component", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Description</span>`,
    })),
    name: "Term",
    "data-testid": "description-list-item",
  } satisfies ItemProps;

  it("renders", async () => {
    const page = render(Harness, { item: { ...baseProps } });
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
      const page = render(Harness, {
        item: { ...baseProps, [attribute]: expected },
      });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Harness, {
        item: { ...baseProps, class: "test-class" },
      });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
    });

    it("applies style", async () => {
      const page = render(Harness, {
        item: { ...baseProps, style: "color: orange;" },
      });
      await expect
        .element(componentLocator(page))
        .toHaveStyle({ color: "orange" });
    });
  });
});

function componentLocator(page: RenderResult<typeof Harness>): Locator {
  return page.getByTestId("description-list-item");
}

function termLocator(page: RenderResult<typeof Harness>): Locator {
  return page.getByRole("term");
}

function descriptionLocator(page: RenderResult<typeof Harness>): Locator {
  return page.getByRole("definition");
}
