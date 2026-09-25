/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import { describe, expect, it } from "vitest";
import Harness from "./test-harness.svelte";
import type { SortButtonProps } from "./types.js";

describe("SortButton SSR", () => {
  const baseProps = {
    "aria-label": "Sort",
  } satisfies SortButtonProps;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Harness, { props: { sortButton: { ...baseProps } } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Harness, {
        props: { sortButton: { ...baseProps } },
      });
      expect(componentLocator(page)).toBeInstanceOf(
        page.window.HTMLButtonElement,
      );
    });
  });

  describe("attributes", () => {
    it.each([["id", "test-id"]])("applies %s", (attribute, expected) => {
      const page = render(Harness, {
        props: { sortButton: { ...baseProps, [attribute]: expected } },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies classes", () => {
      const page = render(Harness, {
        props: { sortButton: { ...baseProps, class: "test-class" } },
      });
      expect(componentLocator(page).classList).toContain("test-class");
    });

    it("applies style", () => {
      const page = render(Harness, {
        props: { sortButton: { ...baseProps, style: "color: orange;" } },
      });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByRole("button", { name: "Sort" });
}
