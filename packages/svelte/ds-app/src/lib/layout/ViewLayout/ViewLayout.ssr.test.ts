import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./ViewLayout.svelte";

describe("ViewLayout SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => "<span>Test content</span>",
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders without throwing", () => {
    expect(() => {
      render(Component, {
        props: {
          ...baseProps,
          aside: createRawSnippet(() => ({
            render: () => "<span>Aside</span>",
          })),
        },
      });
    }).not.toThrow();
  });

  it("renders content, aside, and base classes", () => {
    const page = render(Component, {
      props: {
        ...baseProps,
        aside: createRawSnippet(() => ({
          render: () => "<span>Aside</span>",
        })),
      },
    });

    expect(componentRoot(page).className).toContain("ds view-layout");
    expect(page.getByText("Test content")).toBeTruthy();
    expect(page.getByText("Aside")).toBeTruthy();
  });
});

function componentRoot(page: RenderResult): HTMLElement {
  return page.container.firstElementChild as HTMLElement;
}
