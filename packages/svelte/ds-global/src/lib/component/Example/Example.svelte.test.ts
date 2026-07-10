import type { RenderResult } from "@testing-library/svelte";
import { render } from "@testing-library/svelte";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Example.svelte";

describe("Example component", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<span>Example</span>`,
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    expect(componentElement(page)).toBeInTheDocument();
    expect(page.getByText("Example")).toBeVisible();
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      expect(componentElement(page)).toHaveAttribute(attribute, expected);
    });

    it("applies classes", () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      expect(componentElement(page)).toHaveClass("test-class");
      expect(componentElement(page)).toHaveClass("ds");
      expect(componentElement(page)).toHaveClass("example");
    });

    it("applies style", () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      expect(componentElement(page)).toHaveAttribute(
        "style",
        expect.stringContaining("color: orange"),
      );
    });
  });
});

function componentElement(page: RenderResult<typeof Component>): HTMLElement {
  return page.getByTestId("example");
}
