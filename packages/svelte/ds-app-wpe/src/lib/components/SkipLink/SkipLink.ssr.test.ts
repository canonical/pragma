import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./SkipLink.svelte";

describe("SkipLink SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: {} });
    }).not.toThrow();
  });

  it("renders as an anchor", () => {
    const page = render(Component, { props: {} });
    expect(componentLocator(page)).toBeInstanceOf(
      page.window.HTMLAnchorElement,
    );
  });

  describe("content", () => {
    it("renders default text when no children are provided", () => {
      const page = render(Component, { props: {} });
      expect(componentLocator(page).textContent).toBe("Skip to main content");
    });

    it("renders custom children when provided", () => {
      const page = render(Component, {
        props: {
          children: createRawSnippet(() => ({ render: () => "Go to main" })),
        } satisfies ComponentProps<typeof Component>,
      });
      expect(componentLocator(page).textContent).toBe("Go to main");
    });
  });

  describe("href", () => {
    it("links to #main by default", () => {
      const page = render(Component, { props: {} });
      expect(componentLocator(page).getAttribute("href")).toBe("#main");
    });

    it("links to a custom mainId when provided", () => {
      const page = render(Component, {
        props: { mainId: "content" } satisfies ComponentProps<typeof Component>,
      });
      expect(componentLocator(page).getAttribute("href")).toBe("#content");
    });
  });

  it("keeps base classes when a custom class is added", () => {
    const page = render(Component, {
      props: { class: "test-class" } satisfies ComponentProps<typeof Component>,
    });
    const el = componentLocator(page);
    expect(el.classList).toContain("ds");
    expect(el.classList).toContain("skip-link");
    expect(el.classList).toContain("test-class");
  });
});

// Note: Prefer role/semantics-oriented ways of selecting elements (e.g., by role, label, etc.) not only for component roots but for all elements to enhance accessibility and maintainability.
// To select the component's root element, use one of the available [Queries](https://testing-library.com/docs/queries/about/#priority).
function componentLocator(page: RenderResult): HTMLElement {
  return page.getByRole("link");
}
