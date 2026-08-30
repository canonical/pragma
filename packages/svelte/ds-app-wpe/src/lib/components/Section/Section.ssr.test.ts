import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Section.svelte";

describe("Section SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Section content</span>`,
    })),
  } satisfies ComponentProps<typeof Component>;

  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { ...baseProps } });
    }).not.toThrow();
  });

  it("renders as a section", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(componentLocator(page)).toBeInstanceOf(page.window.HTMLElement);
    expect(componentLocator(page).tagName).toBe("SECTION");
  });

  it("renders content", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(page.getByText("Section content")).toBeInstanceOf(
      page.window.HTMLElement,
    );
  });

  it("applies the ds section classes", () => {
    const page = render(Component, { props: { ...baseProps } });
    const root = componentLocator(page);
    expect(root.classList).toContain("ds");
    expect(root.classList).toContain("section");
  });

  it("applies the bordered class when bordered", () => {
    const page = render(Component, {
      props: { ...baseProps, bordered: true },
    });
    expect(componentLocator(page).classList).toContain("bordered");
  });

  it("applies the spacing modifier class", () => {
    const page = render(Component, {
      props: { ...baseProps, spacing: "deep" },
    });
    expect(componentLocator(page).classList).toContain("deep");
  });

  it("applies a custom class", () => {
    const page = render(Component, {
      props: { ...baseProps, class: "test-class" },
    });
    const root = componentLocator(page);
    expect(root.classList).toContain("section");
    expect(root.classList).toContain("test-class");
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.container.querySelector(".ds.section") as HTMLElement;
}
