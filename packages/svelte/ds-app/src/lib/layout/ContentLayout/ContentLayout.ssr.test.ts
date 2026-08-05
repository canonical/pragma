import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./ContentLayout.svelte";

describe("ContentLayout SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => "<span>Test content</span>",
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders without throwing", () => {
    expect(() => {
      render(Component, {
        props: { ...baseProps },
      });
    }).not.toThrow();
  });

  it("renders content and base classes", () => {
    const page = render(Component, {
      props: { ...baseProps },
    });

    expect(componentRoot(page).className).toContain("ds content-layout");
    expect(page.getByText("Test content")).toBeTruthy();
  });
});

function componentRoot(page: RenderResult): HTMLElement {
  return page.container.firstElementChild as HTMLElement;
}
