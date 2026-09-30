import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./KeyboardKeys.svelte";

const children = createRawSnippet(() => ({
  render: () => "<span>Test content</span>",
})) satisfies ComponentProps<typeof Component>["children"];

describe("KeyboardKeys SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { children } });
    }).not.toThrow();
  });

  it("renders as a kbd element", () => {
    const page = render(Component, {
      props: { children, "data-testid": "keyboard-keys" },
    });
    expect(page.getByTestId("keyboard-keys").tagName).toBe("KBD");
  });

  it("renders children", () => {
    const page = render(Component, { props: { children } });
    expect(page.getByText("Test content")).toBeInstanceOf(
      page.window.HTMLElement,
    );
  });

  it("keeps base classes when a custom class is added", () => {
    const page = render(Component, {
      props: {
        children,
        class: "custom-class",
        "data-testid": "keyboard-keys",
      },
    });
    const el = page.getByTestId("keyboard-keys");
    expect(el.classList).toContain("ds");
    expect(el.classList).toContain("keyboard-keys");
    expect(el.classList).toContain("custom-class");
  });
});
