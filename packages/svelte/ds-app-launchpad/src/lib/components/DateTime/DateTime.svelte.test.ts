/* @canonical/generator-ds 0.17.1 */

import type { ComponentProps } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./DateTime.svelte";

vi.mock("./utils/formatters.js", () => {
  return {
    defaultDateTimeFormatter: new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC",
    }),
  };
});

const date = new Date("2024-01-01T12:00:00Z");
const timestamp = date.getTime();
const dateString = date.toISOString();

describe("DateTime component", () => {
  const baseProps = {
    date,
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, baseProps);
    await expect.element(componentLocator(page)).toBeInTheDocument();
  });

  describe("basic attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, value) => {
      const page = render(Component, { ...baseProps, [attribute]: value });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, value);
    });

    it("applies style", async () => {
      const page = render(Component, { ...baseProps, style: "color: orange;" });
      await expect
        .element(componentLocator(page))
        .toHaveStyle("color: orange;");
    });

    it("applies class", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const element = componentLocator(page);
      await expect.element(element).toHaveClass("test-class");
    });
  });

  describe("datetime attribute", () => {
    it("applies correct datetime attribute for Date input", async () => {
      const page = render(Component, baseProps);
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("datetime", date.toISOString());
    });

    it("applies correct datetime attribute for timestamp input", async () => {
      const page = render(Component, { ...baseProps, date: timestamp });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("datetime", date.toISOString());
    });

    it("applies correct datetime attribute for date string input", async () => {
      const page = render(Component, { ...baseProps, date: dateString });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("datetime", date.toISOString());
    });
  });

  it("accepts custom formatter", async () => {
    const page = render(Component, {
      ...baseProps,
      formatter: {
        format: (date: Date) => `Formatted: ${date.toISOString()}`,
      },
    });
    await expect
      .element(componentLocator(page))
      .toHaveTextContent(`Formatted: ${date.toISOString()}`);
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("time");
}
