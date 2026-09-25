/* @canonical/generator-ds 0.17.1 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Harness from "./test-harness.svelte";
import type { ItemProps } from "./types.js";

describe("Item SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Description</span>`,
    })),
    name: "Term",
    "data-testid": "description-list-item",
  } satisfies ItemProps;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Harness, { props: { item: { ...baseProps } } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Harness, { props: { item: { ...baseProps } } });
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
      const page = render(Harness, {
        props: { item: { ...baseProps, [attribute]: expected } },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies classes", () => {
      const page = render(Harness, {
        props: { item: { ...baseProps, class: "test-class" } },
      });
      expect(componentLocator(page).classList).toContain("test-class");
    });

    it("applies style", () => {
      const page = render(Harness, {
        props: { item: { ...baseProps, style: "color: orange;" } },
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
