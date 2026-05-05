import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./SideNavigation.svelte";
import { children, expandToggle, footer, logo } from "./test.fixtures.svelte";

describe("SideNavigation SSR", () => {
  const baseProps = {
    children,
    logo,
    expandToggle,
    footer,
  } satisfies ComponentProps<typeof Component>;

  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { ...baseProps } });
    }).not.toThrow();
  });

  it("renders", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(componentLocator(page)).toBeDefined();
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, value) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: value },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(value);
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { ...baseProps, style: "color: orange;" },
      });
      expect(componentLocator(page).getAttribute("style")).toContain(
        "color: orange;",
      );
    });

    it("applies class", () => {
      const page = render(Component, {
        props: { ...baseProps, class: "test-class" },
      });

      const element = componentLocator(page);
      expect(element.className).toContain("ds");
      expect(element.className).toContain("side-navigation");
      expect(element.className).toContain("test-class");
    });
  });

  describe("contents", () => {
    describe("while expanded", () => {
      it("renders logo", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: true },
        });

        expect(page.getByRole("link", { name: "Logo link" })).toBeTruthy();
      });

      it("renders children", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: true },
        });

        expect(page.getByRole("navigation")).toBeTruthy();
        expect(page.getByRole("link", { name: "Link in nav" })).toBeTruthy();
        expect(
          page.getByRole("button", { name: "Button in nav" }),
        ).toBeTruthy();
      });

      it("renders expand toggle", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: true },
        });

        const expandToggle = page.getByRole("button", {
          name: "Collapse navigation",
        });
        expect(expandToggle).toBeTruthy();
        expect(expandToggle.getAttribute("aria-expanded")).toBe("true");

        expect(expandToggle.getAttribute("aria-controls")).toBe(
          page.getByRole("navigation").id,
        );
      });

      it("renders footer", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: true },
        });

        expect(page.getByRole("link", { name: "Link in footer" })).toBeTruthy();
        expect(
          page.getByRole("button", { name: "Button in footer" }),
        ).toBeTruthy();
      });
    });

    describe("while expanded", () => {
      it("renders logo", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: false },
        });

        expect(page.getByRole("link", { name: "Logo link" })).toBeTruthy();
      });

      it("doesn't render children", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: false },
        });

        expect(page.queryByRole("navigation")).toBeNull();
      });

      it("renders expand toggle", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: false },
        });

        const expandToggle = page.getByRole("button", {
          name: "Expand navigation",
        });
        expect(expandToggle).toBeTruthy();
        expect(expandToggle.getAttribute("aria-expanded")).toBe("false");

        expect(expandToggle.getAttribute("aria-controls")).toBeTruthy();
      });

      it("renders footer", () => {
        const page = render(Component, {
          props: { ...baseProps, expanded: false },
        });

        expect(page.getByRole("link", { name: "Link in footer" })).toBeTruthy();
        expect(
          page.getByRole("button", { name: "Button in footer" }),
        ).toBeTruthy();
      });
    });
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByRole("banner");
}
