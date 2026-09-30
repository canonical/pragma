import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Component from "./Spinner.svelte";

describe("Spinner subcomponent", () => {
  it("renders the spinner icon", () => {
    const page = render(Component);
    expect(page.container.querySelector("use")?.getAttribute("href")).toBe(
      "/icons/spinner.svg#spinner",
    );
  });

  it("applies the spinner class", () => {
    const page = render(Component);
    const svg = page.container.querySelector("svg");
    expect(svg?.classList.contains("ds")).toBe(true);
    expect(svg?.classList.contains("spinner")).toBe(true);
  });

  it("is decorative by default", () => {
    const page = render(Component);
    const svg = page.container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.hasAttribute("role")).toBe(false);
  });

  it("exposes a named image when aria-label is provided", async () => {
    const page = render(Component, { "aria-label": "Loading" });
    await expect
      .element(page.getByRole("img", { name: "Loading" }))
      .toBeInTheDocument();
    expect(
      page.container.querySelector("svg")?.hasAttribute("aria-hidden"),
    ).toBe(false);
  });

  it("treats an empty aria-label as decorative", () => {
    const page = render(Component, { "aria-label": "" });
    const svg = page.container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.hasAttribute("role")).toBe(false);
  });

  it("honours an explicit role", () => {
    const page = render(Component, { role: "presentation" });
    const svg = page.container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("presentation");
    expect(svg?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("merges a consumer class alongside the spinner class", () => {
    const page = render(Component, { class: "test-class" });
    const svg = page.container.querySelector("svg");
    expect(svg?.classList.contains("spinner")).toBe(true);
    expect(svg?.classList.contains("test-class")).toBe(true);
  });

  it("resolves the icon from a custom rootPath", () => {
    const page = render(Component, { rootPath: "/assets/icons" });
    expect(page.container.querySelector("use")?.getAttribute("href")).toBe(
      "/assets/icons/spinner.svg#spinner",
    );
  });
});
