import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Card.svelte";

describe("Card SSR", () => {
  const baseProps = {} satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders as a div", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page)).toBeInstanceOf(page.window.HTMLDivElement);
    });

    it("applies ds card classes", () => {
      const page = render(Component, { props: { ...baseProps } });
      const root = componentLocator(page);
      expect(root.classList).toContain("ds");
      expect(root.classList).toContain("card");
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-label"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: expected },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
    });
  });
});

function componentLocator(page: ReturnType<typeof render>): HTMLElement {
  return page.container.querySelector(".ds.card") as HTMLElement;
}
