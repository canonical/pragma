/* @canonical/generator-ds 0.10.0-experimental.5 */

import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Link.svelte";

describe("HiddenEvents.Link SSR", () => {
  const baseProps = {
    href: "/show-all",
    children: createRawSnippet(() => ({
      render: () => "<span>Show all</span>",
    })),
  } satisfies ComponentProps<typeof Component>;

  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { ...baseProps } });
    }).not.toThrow();
  });

  it("renders", () => {
    const page = render(Component, { props: { ...baseProps } });
    const link = page.getByRole("link");
    expect(link.textContent).toContain("Show all");
    expect(link.getAttribute("href")).toBe("/show-all");
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, value) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: value },
      });
      expect(page.getByRole("link").getAttribute(attribute)).toBe(value);
    });

    it("applies class", () => {
      const page = render(Component, {
        props: { ...baseProps, class: "test-class" },
      });
      const link = page.getByRole("link");
      expect(link.classList.contains("ds")).toBe(true);
      expect(link.classList.contains("timeline-hidden-events-link")).toBe(true);
      expect(link.classList.contains("test-class")).toBe(true);
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { ...baseProps, style: "color: orange;" },
      });
      expect(page.getByRole("link").getAttribute("style")).toContain(
        "color: orange;",
      );
    });
  });
});
