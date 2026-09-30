import { render } from "@canonical/svelte-ssr-test";
import { describe, expect, it } from "vitest";
import Component from "./Breadcrumbs.svelte";

describe("Breadcrumbs SSR", () => {
  it("renders without errors on server", () => {
    const page = render(Component, {
      props: {
        items: [
          { url: "/", label: "Home" },
          { url: "/products", label: "Products" },
          { key: "current", label: "Current", current: true },
        ],
      },
    });
    expect(page.getByText("Home")).toBeInstanceOf(page.window.HTMLElement);
    expect(page.getByText("Products")).toBeInstanceOf(page.window.HTMLElement);
    expect(page.getByText("Current")).toBeInstanceOf(page.window.HTMLElement);

    const nav = page.container.querySelector("nav");
    expect(nav?.classList).toContain("ds");
    expect(nav?.classList).toContain("breadcrumbs");
  });

  it("renders nav with aria-label on server", () => {
    const page = render(Component, {
      props: { items: [{ url: "/", label: "Home" }] },
    });
    const nav = page.container.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Breadcrumb");
  });

  it("renders current item with aria-current on server", () => {
    const page = render(Component, {
      props: { items: [{ key: "current", label: "Current", current: true }] },
    });
    expect(page.getByText("Current").getAttribute("aria-current")).toBe("page");
  });
});
