/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./SearchBox.svelte";

const baseProps = {
  "aria-label": "Search articles",
  "data-testid": "search-box",
} satisfies ComponentProps<typeof Component>;

describe("SearchBox SSR", () => {
  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page)).toBeInstanceOf(page.window.HTMLDivElement);
      expect(inputLocator(page)).toBeInstanceOf(page.window.HTMLInputElement);
      expect(buttonLocator(page)).toBeInstanceOf(page.window.HTMLButtonElement);
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: { ...baseProps, class: "test-class" },
      });
      expect(componentLocator(page).classList).toContain("test-class");
      expect(componentLocator(page).classList).toContain("ds");
      expect(componentLocator(page).classList).toContain("search-box");
    });
  });

  describe("input attributes", () => {
    it.each([
      ["name", "test-name"],
      ["value", "test-value"],
      ["placeholder", "test-placeholder"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: expected },
      });
      expect(inputLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { style: "color: orange;", ...baseProps },
      });
      expect(inputLocator(page).style.color).toBe("orange");
    });
  });

  describe("button and input", () => {
    it("are not disabled by default", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(inputLocator(page).disabled).toBe(false);
      expect(buttonLocator(page).disabled).toBe(false);
    });

    it("can be disabled", () => {
      const page = render(Component, {
        props: { ...baseProps, disabled: true },
      });
      expect(inputLocator(page).disabled).toBe(true);
      expect(buttonLocator(page).disabled).toBe(true);
    });

    it("share the same accessible name", () => {
      const label = "test-label";
      const page = render(Component, {
        props: { ...baseProps, "aria-label": label },
      });
      expect(page.getByRole("searchbox", { name: label })).toBeDefined();
      expect(page.getByRole("button", { name: label })).toBeDefined();
    });
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByTestId("search-box");
}

function inputLocator(page: RenderResult): HTMLInputElement {
  return page.getByRole("searchbox", { name: baseProps["aria-label"] });
}

function buttonLocator(page: RenderResult): HTMLButtonElement {
  return page.getByRole("button", { name: baseProps["aria-label"] });
}
