import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Example.svelte";

describe("Example component", () => {
  const baseProps = {
    "data-testid": "example",
  } satisfies ComponentProps<typeof Component>;

  it("renders default content", async () => {
    const page = render(Component, { ...baseProps });
    const component = componentLocator(page);

    await expect.element(component).toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Click me" }))
      .toBeVisible();
    await expect.element(page.getByText("Count: 0")).toBeVisible();
  });

  it("increments count on click", async () => {
    const page = render(Component, { ...baseProps });
    const button = page.getByRole("button", { name: "Click me" });

    await button.click();
    await expect.element(page.getByText("Count: 1")).toBeVisible();

    await button.click();
    await expect.element(page.getByText("Count: 2")).toBeVisible();
  });

  describe("attributes", () => {
    it.each<["id" | "aria-label", string]>([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      const component = componentLocator(page);

      await expect.element(component).toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const component = componentLocator(page);

      await expect.element(component).toHaveClass("test-class");
      await expect.element(component).toHaveClass("workplace");
      await expect.element(component).toHaveClass("example");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      const component = componentLocator(page);

      await expect.element(component).toHaveStyle({ color: "orange" });
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("example");
}
