/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Component from "./Link.svelte";

describe("HiddenEvents.Link component", () => {
  const baseProps = {
    href: "/show-all",
    children: createRawSnippet(() => ({
      render: () => "<span>Show all</span>",
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, baseProps);
    await expect.element(page.getByRole("link")).toBeInTheDocument();
    await expect.element(page.getByText("Show all")).toBeInTheDocument();
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, value) => {
      const page = render(Component, { ...baseProps, [attribute]: value });
      await expect
        .element(page.getByRole("link"))
        .toHaveAttribute(attribute, value);
    });

    it("applies href", async () => {
      const page = render(Component, { ...baseProps, href: "/show-more" });
      await expect
        .element(page.getByRole("link"))
        .toHaveAttribute("href", "/show-more");
    });

    it("applies class", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const element = page.getByRole("link");
      await expect.element(element).toHaveClass("ds");
      await expect.element(element).toHaveClass("timeline-hidden-events-link");
      await expect.element(element).toHaveClass("test-class");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(page.getByRole("link"))
        .toHaveStyle("color: orange;");
    });
  });
});
