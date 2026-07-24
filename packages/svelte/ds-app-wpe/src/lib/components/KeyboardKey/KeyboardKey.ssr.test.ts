import { render } from "@canonical/svelte-ssr-test";
import { describe, expect, it } from "vitest";
import Component from "./KeyboardKey.svelte";

describe("KeyboardKey SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { keyValue: "enter" } });
    }).not.toThrow();
  });

  it("renders as a kbd element", () => {
    const page = render(Component, { props: { keyValue: "enter" } });
    expect(page.getByText("↵").tagName).toBe("KBD");
  });

  it("renders the label for a key", () => {
    const page = render(Component, { props: { keyValue: "enter" } });
    expect(page.getByText("↵")).toBeInstanceOf(page.window.HTMLElement);
  });

  it("sets an accessible label for symbol keys", () => {
    const page = render(Component, { props: { keyValue: "enter" } });
    expect(page.getByText("↵").getAttribute("aria-label")).toBe("Enter");
  });

  it("keeps base classes when a custom class is added", () => {
    const page = render(Component, {
      props: { keyValue: "ctrl", class: "test-class" },
    });
    const el = page.getByText("Ctrl");
    expect(el.classList).toContain("ds");
    expect(el.classList).toContain("keyboard-key");
    expect(el.classList).toContain("code");
    expect(el.classList).toContain("test-class");
  });
});
