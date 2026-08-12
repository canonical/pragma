import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./ApplicationLayout.svelte";

describe("ApplicationLayout SSR", () => {
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
          navigation: createRawSnippet(() => ({
            render: () => "<span>Nav</span>",
          })),
        },
      });
    }).not.toThrow();
  });

  it("renders content, navigation, and base classes", () => {
    const page = render(Component, {
      props: {
        ...baseProps,
        navigation: createRawSnippet(() => ({
          render: () => "<span>Nav</span>",
        })),
      },
    });

    expect(componentRoot(page).className).toContain("ds application-layout");
    expect(page.getByText("Test content")).toBeTruthy();
    expect(page.getByText("Nav")).toBeTruthy();
  });
});

function componentRoot(page: RenderResult): HTMLElement {
  return page.container.firstElementChild as HTMLElement;
}
