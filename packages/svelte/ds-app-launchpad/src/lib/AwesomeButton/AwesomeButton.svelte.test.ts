import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "@vitest/browser/context";
import { createRawSnippet } from "svelte";
import Button from "./AwesomeButton.svelte";

describe("AwesomeButton", () => {
  describe("Initial Rendering", () => {
    test("should render with default props", async () => {
      const children = createRawSnippet(() => ({
        render: () => `<span>Click me</span>`,
      }));

      render(Button, { children });

      const button = page.getByRole("button");
      await expect.element(button).toBeInTheDocument();
      await expect.element(button).toHaveTextContent("Click me");
    });

    test("should apply custom class and id", async () => {
      const children = createRawSnippet(() => ({
        render: () => `<span>Submit</span>`,
      }));

      render(Button, {
        id: "submit-btn",
        class: "custom-class",
        children,
      });

      const button = page.getByRole("button");
      await expect.element(button).toHaveAttribute("id", "submit-btn");
      await expect
        .element(button)
        .toHaveClass("ds awesome-button custom-class");
    });

    test("should apply inline styles", async () => {
      const children = createRawSnippet(() => ({
        render: () => `<span>Styled</span>`,
      }));

      render(Button, {
        style: "color: red; background: blue;",
        children,
      });

      const button = page.getByRole("button");
      await expect
        .element(button)
        .toHaveAttribute("style", "color: red; background: blue;");
    });
  });
});
