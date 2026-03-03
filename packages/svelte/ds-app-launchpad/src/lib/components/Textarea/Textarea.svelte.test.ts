import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Textarea.svelte";
import type { TextareaProps } from "./types";

describe("Textarea component", () => {
  const baseProps = {} satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps, value: "Textarea" });
    await expect.element(componentLocator(page)).toBeVisible();
    await expect.element(componentLocator(page)).toHaveValue("Textarea");
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
      await expect.element(componentLocator(page)).toHaveClass("ds");
      await expect.element(componentLocator(page)).toHaveClass("textarea");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(componentLocator(page))
        .toHaveStyle({ color: "orange" });
    });
  });

  describe("rows", () => {
    it("applies static rows when rows is a number", async () => {
      const props = $state({
        value: "Textarea",
        rows: 3,
      }) satisfies TextareaProps;
      const page = render(Component, props);
      const element = componentLocator(page);
      await expect.element(element).toHaveAttribute("rows", "3");
      props.value = "Textarea\nTextarea\nTextarea\nTextarea\nTextarea";
      await expect.element(element).toHaveAttribute("rows", "3");
    });

    it("applies the min rows when value is empty", async () => {
      const props = $state({
        value: "",
        rows: 3,
      }) satisfies TextareaProps;
      const page = render(Component, props);
      const element = componentLocator(page);
      await expect.element(element).toHaveAttribute("rows", "3");
    });

    it("applies dynamic rows when rows is a tuple", async () => {
      const props = $state({
        value: "Textarea",
        rows: [2, 5],
      }) satisfies TextareaProps;
      const page = render(Component, props);
      const element = componentLocator(page);
      await expect.element(element).toHaveAttribute("rows", "2");
      props.value =
        "Textarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea";
      await expect.element(element).toHaveAttribute("rows", "5");
      props.value = "Textarea";
      await expect.element(element).toHaveAttribute("rows", "2");
    });

    it("rows grow and shrink dynamically", async () => {
      const props = $state({
        value: "Textarea",
        rows: [2, 5],
      }) satisfies TextareaProps;
      const page = render(Component, props);
      const element = componentLocator(page);
      await expect.element(element).toHaveAttribute("rows", "2");
      const longText =
        "Textarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea\nTextarea";
      props.value = longText;
      await expect.element(element).toHaveAttribute("rows", "5");
      props.value = "Textarea";
      await expect.element(element).toHaveAttribute("rows", "2");
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("textbox");
}
