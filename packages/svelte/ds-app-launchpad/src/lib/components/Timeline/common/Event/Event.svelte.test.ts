/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Event.svelte";

describe("Event component", () => {
  const children = createRawSnippet(() => ({
    render: () => `<span>Child Content</span>`,
  }));

  const titleRow = createRawSnippet(() => ({
    render: () => `<span>Title Row Content</span>`,
  }));

  const baseProps = {} satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("renders", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).toBeInTheDocument();
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, value) => {
      const page = render(Component, { ...baseProps, [attribute]: value });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, value);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const element = componentLocator(page);
      await expect.element(element).toHaveClass("ds");
      await expect.element(element).toHaveClass("timeline-event");
      await expect.element(element).toHaveClass("test-class");
    });

    it("applies style", async () => {
      const page = render(Component, { ...baseProps, style: "color: orange;" });
      await expect
        .element(componentLocator(page))
        .toHaveStyle({ color: "orange" });
    });
  });

  describe("Renders", () => {
    it("renders children", async () => {
      const page = render(Component, { ...baseProps, children });
      await expect.element(page.getByText("Child Content")).toBeInTheDocument();
    });

    it("renders title row", async () => {
      const page = render(Component, { ...baseProps, titleRow });
      await expect
        .element(page.getByText("Title Row Content"))
        .toBeInTheDocument();
      await expect
        .element(componentLocator(page))
        .toHaveClass("with-title-row");
    });

    describe("Marker", () => {
      it("empty by default", async () => {
        const page = render(Component, { ...baseProps });
        const element = componentLocator(page);
        await expect.element(element).toHaveClass("marker-empty");
        expect(element.element().querySelector(".marker")).toBeInTheDocument();
      });

      it("small", async () => {
        const page = render(Component, {
          ...baseProps,
          marker: { userName: "John Doe" },
          markerSize: "small",
        });
        const element = componentLocator(page);
        await expect.element(element).toHaveClass("marker-small");
        expect(element.element().querySelector(".marker")).toBeInTheDocument();
      });

      it("large", async () => {
        const page = render(Component, {
          ...baseProps,
          marker: { userName: "John Doe" },
          markerSize: "large",
        });
        const element = componentLocator(page);
        await expect.element(element).toHaveClass("marker-large");
        expect(element.element().querySelector(".marker")).toBeInTheDocument();
      });
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("listitem");
}
