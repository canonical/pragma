import { render } from "@canonical/svelte-ssr-test";
import { describe, expect, it } from "vitest";
import Component from "./Spinner.svelte";

describe("Spinner SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: {} });
    }).not.toThrow();
  });

  it("renders the spinner icon", () => {
    const page = render(Component, { props: {} });
    expect(page.container.querySelector("svg")).not.toBeNull();
    expect(page.container.querySelector("use")?.getAttribute("href")).toBe(
      "/icons/spinner.svg#spinner",
    );
  });

  it("applies the spinner class", () => {
    const page = render(Component, { props: {} });
    const svg = page.container.querySelector("svg");
    expect(svg?.classList.contains("ds")).toBe(true);
    expect(svg?.classList.contains("spinner")).toBe(true);
  });

  it("is decorative by default", () => {
    const page = render(Component, { props: {} });
    const svg = page.container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.hasAttribute("role")).toBe(false);
  });

  it("renders a named image when aria-label is provided", () => {
    const page = render(Component, { props: { "aria-label": "Loading" } });
    const svg = page.container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Loading");
    expect(svg?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps base classes when a custom class is added", () => {
    const page = render(Component, { props: { class: "test-class" } });
    const svg = page.container.querySelector("svg");
    expect(svg?.classList.contains("spinner")).toBe(true);
    expect(svg?.classList.contains("test-class")).toBe(true);
  });

  it("resolves the icon from a custom rootPath", () => {
    const page = render(Component, { props: { rootPath: "/assets/icons" } });
    expect(page.container.querySelector("use")?.getAttribute("href")).toBe(
      "/assets/icons/spinner.svg#spinner",
    );
  });
});
