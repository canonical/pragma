import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import { describe, expect, it } from "vitest";
import Component from "./Checkbox.svelte";

describe("Checkbox SSR", () => {
  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, {});
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, {});
      expect(componentLocator(page)).toBeInstanceOf(
        page.window.HTMLInputElement,
      );
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, { props: { [attribute]: expected } });
      expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies classes", () => {
      const page = render(Component, { props: { class: "test-class" } });
      expect(componentLocator(page).classList).toContain("test-class");
      expect(componentLocator(page).classList).toContain("ds");
      expect(componentLocator(page).classList).toContain("checkbox");
    });

    it("applies style", () => {
      const page = render(Component, { props: { style: "color: orange;" } });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });

  describe("Checked state", () => {
    it("isn't checked by default", () => {
      const page = render(Component);
      expect(componentLocator(page).checked).toBe(false);
    });

    it("can be checked", () => {
      const page = render(Component, { props: { checked: true } });
      expect(componentLocator(page).checked).toBe(true);
    });
  });

  describe("Group controlled", () => {
    it("isn't checked if group and value are undefined", () => {
      const page = render(Component, {
        props: { group: undefined, value: undefined },
      });
      expect(componentLocator(page).checked).toBe(false);
    });

    it("isn't checked if group doesn't include value", () => {
      const page = render(Component, {
        props: {
          group: ["a", "b"],
          value: "c",
        },
      });
      expect(componentLocator(page).checked).toBe(false);
    });

    it("is checked if group includes value", () => {
      const page = render(Component, {
        props: {
          group: ["a", "b", "c"],
          value: "c",
        },
      });
      expect(componentLocator(page).checked).toBe(true);
    });
  });
});

function componentLocator(page: RenderResult): HTMLInputElement {
  return page.getByRole("checkbox");
}
