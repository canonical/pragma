import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Cards.svelte";

describe("Cards SSR", () => {
  const baseProps = {} satisfies ComponentProps<typeof Component>;

  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { ...baseProps } });
    }).not.toThrow();
  });

  it("renders as a div with ds cards subgrid classes", () => {
    const page = render(Component, { props: { ...baseProps } });
    const root = componentLocator(page);
    expect(root).toBeInstanceOf(page.window.HTMLDivElement);
    expect(root.classList).toContain("ds");
    expect(root.classList).toContain("cards");
    expect(root.classList).toContain("subgrid");
  });

  it("sets --card-span to 1 by default", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(componentLocator(page).style.getPropertyValue("--card-span")).toBe(
      "1",
    );
  });

  it("sets --card-span from cardSpan", () => {
    const page = render(Component, { props: { cardSpan: 4 } });
    expect(componentLocator(page).style.getPropertyValue("--card-span")).toBe(
      "4",
    );
  });

  it("clamps cardSpan to at least 1", () => {
    const page = render(Component, { props: { cardSpan: 0 } });
    expect(componentLocator(page).style.getPropertyValue("--card-span")).toBe(
      "1",
    );
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
  return page.container.querySelector(".ds.cards") as HTMLElement;
}
