import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Component from "./Breadcrumbs.svelte";
import type { BreadcrumbItem } from "./types.js";

describe("Breadcrumbs", () => {
  it("renders items", async () => {
    const page = render(Component, {
      items: [
        { url: "/", label: "Home" },
        { url: "/products", label: "Products" },
      ],
    });
    await expect.element(page.getByText("Home")).toBeInTheDocument();
    await expect.element(page.getByText("Products")).toBeInTheDocument();
  });

  it("renders as nav element with aria-label", async () => {
    const page = render(Component, {
      "data-testid": "nav",
      items: [{ url: "/", label: "Home" }],
    });
    const nav = page.getByTestId("nav");
    expect(nav.element().tagName).toBe("NAV");
    await expect.element(nav).toHaveAttribute("aria-label", "Breadcrumb");
  });

  it("allows custom aria-label", async () => {
    const page = render(Component, {
      "aria-label": "Site navigation",
      "data-testid": "nav",
      items: [{ url: "/", label: "Home" }],
    });
    await expect
      .element(page.getByTestId("nav"))
      .toHaveAttribute("aria-label", "Site navigation");
  });

  it("applies ds breadcrumbs class", async () => {
    const page = render(Component, {
      "data-testid": "nav",
      items: [{ url: "/", label: "Home" }],
    });
    await expect
      .element(page.getByTestId("nav"))
      .toHaveClass("ds", "breadcrumbs");
  });

  it("renders Item with link", async () => {
    const page = render(Component, {
      items: [{ url: "/test", label: "Test Link" }],
    });
    const link = page.getByText("Test Link");
    expect(link.element().tagName).toBe("A");
    await expect.element(link).toHaveAttribute("href", "/test");
  });

  it("renders current Item without link", async () => {
    const page = render(Component, {
      items: [{ key: "current", label: "Current Page", current: true }],
    });
    const current = page.getByText("Current Page");
    expect(current.element().tagName).toBe("SPAN");
    await expect.element(current).toHaveAttribute("aria-current", "page");
  });

  it("renders disabled Item as a non-navigable link marked aria-disabled", async () => {
    const page = render(Component, {
      items: [{ url: "/unavailable", label: "Unavailable", disabled: true }],
    });
    const item = page.getByText("Unavailable");
    expect(item.element().tagName).toBe("SPAN");
    await expect.element(item).toHaveAttribute("aria-disabled", "true");
    await expect.element(item).not.toHaveAttribute("aria-current");
    // aria-disabled is only honored by AT on a widget role; role="link"
    // is what makes it meaningful here (see Item.svelte).
    const link = page.getByRole("link", { name: "Unavailable" });
    await expect.element(link).toBeInTheDocument();
    await expect.element(link).toBeDisabled();
  });

  it("renders separator between items", async () => {
    const page = render(Component, {
      items: [
        { url: "/", label: "Home" },
        { key: "page", label: "Page", current: true },
      ],
    });
    const separators = page.getByText("/").all();
    // Both items have separators, last one hidden via CSS
    await expect.element(separators[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("uses custom separator", () => {
    const page = render(Component, {
      separator: "›",
      items: [
        { url: "/", label: "Home" },
        { key: "page", label: "Page", current: true },
      ],
    });
    expect(page.getByText("›").all()).toHaveLength(2);
  });

  it("maintains DOM order: link before separator", () => {
    const page = render(Component, {
      items: [{ url: "/", label: "Home", class: "test-item" }],
    });
    const item = page.container.querySelector(".test-item");
    const children = item?.children;
    expect(children?.[0]).toHaveClass("link");
    expect(children?.[1]).toHaveClass("separator");
  });

  it("forwards native anchor attributes from an item to its rendered link", async () => {
    const page = render(Component, {
      items: [
        {
          url: "/",
          label: "Home",
          target: "_blank",
          "data-sveltekit-preload-data": "hover",
        },
      ],
    });
    const link = page.getByText("Home");
    await expect.element(link).toHaveAttribute("target", "_blank");
    await expect
      .element(link)
      .toHaveAttribute("data-sveltekit-preload-data", "hover");
  });

  it("renders a custom render snippet for every item when provided on Breadcrumbs", async () => {
    const customItem = createRawSnippet<[BreadcrumbItem]>((getItem) => ({
      render: () => `<li data-testid="custom-item">${getItem().label}</li>`,
    }));
    const page = render(Component, {
      items: [
        { url: "/", label: "Home" },
        { key: "custom", label: "Custom" },
      ],
      render: customItem,
    });
    const customItems = page.getByTestId("custom-item");
    await expect.element(customItems.first()).toBeInTheDocument();
    await expect.element(page.getByText("Custom")).toBeInTheDocument();
  });

  it("uses url as key, falls back to key prop", async () => {
    const page = render(Component, {
      items: [
        { url: "/home", label: "Home" },
        { key: "no-url", label: "No URL" },
      ],
    });
    // Both items should render without key errors
    await expect.element(page.getByText("Home")).toBeInTheDocument();
    await expect.element(page.getByText("No URL")).toBeInTheDocument();
  });

  it("links are keyboard accessible via Tab navigation", () => {
    const page = render(Component, {
      items: [
        { url: "/", label: "Home" },
        { url: "/products", label: "Products" },
        { key: "current", label: "Current", current: true },
      ],
    });

    const homeLink = page.getByText("Home").element();
    const productsLink = page.getByText("Products").element();

    // Links should be focusable
    (homeLink as HTMLElement).focus();
    expect(document.activeElement).toBe(homeLink);

    (productsLink as HTMLElement).focus();
    expect(document.activeElement).toBe(productsLink);

    // Current item (span) should not be a link
    const currentItem = page.getByText("Current").element();
    expect(currentItem.tagName).toBe("SPAN");
  });
});
