import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Announcement.svelte";

describe("Announcement SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Announcement content</span>`,
    })),
  } satisfies ComponentProps<typeof Component>;

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

    it("renders content", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(page.getByText("Announcement content")).toBeInstanceOf(
        page.window.HTMLElement,
      );
    });
  });

  describe("classes", () => {
    it("applies ds announcement classes", () => {
      const page = render(Component, { props: { ...baseProps } });
      const root = componentLocator(page);
      expect(root.classList).toContain("ds");
      expect(root.classList).toContain("announcement");
    });

    it("defaults criticality to information", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page).classList).toContain("information");
    });

    it("applies criticality modifier class", () => {
      const page = render(Component, {
        props: { ...baseProps, criticality: "warning" },
      });
      expect(componentLocator(page).classList).toContain("warning");
    });
  });

  describe("heading", () => {
    it("renders heading when provided as string", () => {
      const page = render(Component, {
        props: { ...baseProps, heading: "System Maintenance" },
      });
      expect(page.getByText("System Maintenance")).toBeInstanceOf(
        page.window.HTMLElement,
      );
    });

    it("omits heading element when not provided", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page).querySelector(".heading")).toBeNull();
    });
  });

  describe("icon", () => {
    it("renders a decorative icon with aria-hidden", () => {
      const page = render(Component, { props: { ...baseProps } });
      const icon = componentLocator(page).querySelector(".icon");
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
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
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.container.querySelector(".ds.announcement") as HTMLElement;
}
