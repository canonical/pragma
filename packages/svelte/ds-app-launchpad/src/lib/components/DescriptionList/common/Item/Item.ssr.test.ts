/* @canonical/generator-ds 0.17.1 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { DescriptionListContext } from "../../types.js";
import Component from "./Item.svelte";

vi.mock("../../context.js", () => {
  return {
    getDescriptionListContext: (): DescriptionListContext => ({
      layout: "auto",
    }),
  };
});

describe("Item SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Description</span>`,
    })),
    name: "Term",
    "data-testid": "description-list-item",
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page)).toBeInstanceOf(page.window.HTMLDivElement);
      expect(termLocator(page).textContent).toBe("Term");
      expect(descriptionLocator(page).textContent).toBe("Description");
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: expected },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: { class: "test-class", ...baseProps },
      });
      expect(componentLocator(page).classList).toContain("test-class");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { style: "color: orange;", ...baseProps },
      });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByTestId("description-list-item");
}

function termLocator(page: RenderResult): HTMLElement {
  return page.getByRole("term");
}

function descriptionLocator(page: RenderResult): HTMLElement {
  return page.getByRole("definition");
}
