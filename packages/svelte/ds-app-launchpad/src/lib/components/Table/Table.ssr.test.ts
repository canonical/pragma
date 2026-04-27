/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { beforeEach, describe, expect, it } from "vitest";
import Component from "./Table.svelte";
import {
  caption,
  children,
  setSortDirection,
  tdText,
  thText,
} from "./test.fixtures.svelte";

describe("Table SSR", () => {
  beforeEach(() => {
    setSortDirection(undefined);
  });

  const baseProps = {
    children,
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page)).toBeInstanceOf(
        page.window.HTMLTableElement,
      );
      expect(thLocator(page)).toBeInstanceOf(page.window.HTMLTableCellElement);
      expect(tdLocator(page)).toBeInstanceOf(page.window.HTMLTableCellElement);
    });
  });

  describe("attributes", () => {
    it.each([["id", "test-id"]])("applies %s", (attribute, expected) => {
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
      expect(componentLocator(page).classList).toContain("ds");
      expect(componentLocator(page).classList).toContain("table");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { style: "color: orange;", ...baseProps },
      });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });

  describe("sort direction", () => {
    it("renders ascending", () => {
      setSortDirection("ascending");
      const page = render(Component, { props: { ...baseProps } });
      const th = thLocator(page);
      expect(th.getAttribute("aria-sort")).toBe("ascending");
    });

    it("renders descending", () => {
      setSortDirection("descending");
      const page = render(Component, { props: { ...baseProps } });
      const th = thLocator(page);
      expect(th.getAttribute("aria-sort")).toBe("descending");
    });
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByRole("table", { name: caption });
}

function thLocator(page: RenderResult): HTMLElement {
  return page.getByRole("columnheader", { name: thText });
}

function tdLocator(page: RenderResult): HTMLElement {
  return page.getByRole("cell", { name: tdText });
}
