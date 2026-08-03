import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Button.svelte";

describe("Button SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Click me</span>`,
    })),
  } satisfies ComponentProps<typeof Component>;

  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { ...baseProps } });
    }).not.toThrow();
  });

  it("renders as a button element", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(componentLocator(page)).toBeInstanceOf(
      page.window.HTMLButtonElement,
    );
  });

  it("renders content", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(page.getByText("Click me")).toBeInstanceOf(page.window.HTMLElement);
  });

  it("applies the ds button classes", () => {
    const page = render(Component, { props: { ...baseProps } });
    const root = componentLocator(page);
    expect(root.classList).toContain("ds");
    expect(root.classList).toContain("button");
  });

  it("applies the default importance class", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(componentLocator(page).classList).toContain("primary");
  });

  it("applies a custom importance class", () => {
    const page = render(Component, {
      props: { ...baseProps, importance: "secondary" } satisfies ComponentProps<
        typeof Component
      >,
    });
    expect(componentLocator(page).classList).toContain("secondary");
  });

  it("applies an anticipation class", () => {
    const page = render(Component, {
      props: {
        ...baseProps,
        anticipation: "destructive",
      } satisfies ComponentProps<typeof Component>,
    });
    expect(componentLocator(page).classList).toContain("destructive");
  });

  it("applies the link variant class", () => {
    const page = render(Component, {
      props: { ...baseProps, variant: "link" } satisfies ComponentProps<
        typeof Component
      >,
    });
    expect(componentLocator(page).classList).toContain("link");
  });

  it("applies a custom class", () => {
    const page = render(Component, {
      props: { ...baseProps, class: "test-class" } satisfies ComponentProps<
        typeof Component
      >,
    });
    const root = componentLocator(page);
    expect(root.classList).toContain("ds");
    expect(root.classList).toContain("button");
    expect(root.classList).toContain("test-class");
  });

  it("applies the loading class when loading", () => {
    const page = render(Component, {
      props: { ...baseProps, loading: true } satisfies ComponentProps<
        typeof Component
      >,
    });
    expect(componentLocator(page).classList).toContain("loading");
  });

  it("sets aria-busy when loading", () => {
    const page = render(Component, {
      props: { ...baseProps, loading: true } satisfies ComponentProps<
        typeof Component
      >,
    });
    expect(componentLocator(page).getAttribute("aria-busy")).toBe("true");
  });

  it("disables the button when loading", () => {
    const page = render(Component, {
      props: { ...baseProps, loading: true } satisfies ComponentProps<
        typeof Component
      >,
    });
    expect((componentLocator(page) as HTMLButtonElement).disabled).toBe(true);
  });
});

function componentLocator(page: RenderResult): HTMLButtonElement {
  return page.container.querySelector(".ds.button") as HTMLButtonElement;
}
