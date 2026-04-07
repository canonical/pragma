import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./CTASection.js";
import type CTASection from "./CTASection.js";

describe("CTASection component", () => {
  let elem: CTASection;

  beforeEach(() => {
    elem = document.createElement("ds-cta-section") as CTASection;
    document.body.appendChild(elem);
  });

  afterEach(() => {
    elem.remove();
  });

  it("should render component", async () => {
    await customElements.whenDefined("ds-cta-section");

    const section = elem.shadowRoot?.querySelector(".ds.cta-section");
    expect(section).toBeTruthy();
  });

  it("should have correct tag name", () => {
    expect(elem.tagName.toLowerCase()).toBe("ds-cta-section");
  });

  it("should render a horizontal rule", async () => {
    await elem.updateComplete;

    const hr = elem.shadowRoot?.querySelector("hr.rule");
    expect(hr).toBeTruthy();
  });

  it("should render fixed-width wrapper when layout is 100", async () => {
    elem.layout = "100";
    await elem.updateComplete;

    const wrapper = elem.shadowRoot?.querySelector(".fixed-width");
    expect(wrapper).toBeTruthy();
    expect(elem.shadowRoot?.querySelector(".grid-row")).toBeNull();
  });

  it("should render grid-row wrapper when layout is 25/75", async () => {
    elem.layout = "25/75";
    await elem.updateComplete;

    const gridRow = elem.shadowRoot?.querySelector(".grid-row");
    expect(gridRow).toBeTruthy();
    expect(elem.shadowRoot?.querySelector(".offset-content")).toBeTruthy();
    expect(elem.shadowRoot?.querySelector(".fixed-width")).toBeNull();
  });

  it("should render title inside h2 for default variant", async () => {
    elem.titleText = "My CTA title";
    elem.variant = "default";
    await elem.updateComplete;

    const h2 = elem.shadowRoot?.querySelector("h2");
    expect(h2?.textContent?.trim()).toContain("My CTA title");
  });

  it("should render inline HTML content in default variant from blocks", async () => {
    elem.variant = "default";
    elem.titleText = "Get started";
    elem.blocks = [
      {
        type: "cta",
        item: {
          type: "html",
          content: "<a href='/download'>Download now</a>",
        },
      },
    ];
    await elem.updateComplete;

    const link = elem.shadowRoot?.querySelector("h2 a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/download");
    expect(link?.textContent).toBe("Download now");
  });

  it("should render description block in block variant", async () => {
    elem.variant = "block";
    elem.titleText = "Title";
    elem.blocks = [
      {
        type: "description",
        item: { content: "Some description text" },
      },
    ];
    await elem.updateComplete;

    const desc = elem.shadowRoot?.querySelector("p.description");
    expect(desc).toBeTruthy();
    expect(desc?.textContent).toBe("Some description text");
  });

  it("should render HTML description when type is html", async () => {
    elem.variant = "block";
    elem.titleText = "Title";
    elem.blocks = [
      {
        type: "description",
        item: { type: "html", content: "<p>Rich <strong>content</strong></p>" },
      },
    ];
    await elem.updateComplete;

    const desc = elem.shadowRoot?.querySelector("div.description");
    expect(desc).toBeTruthy();
    expect(desc?.querySelector("strong")?.textContent).toBe("content");
  });

  it("should render ds-cta-block in block variant", async () => {
    elem.variant = "block";
    elem.titleText = "Title";
    elem.blocks = [
      {
        type: "cta",
        item: {
          primary: { content_html: "Go", attrs: { href: "#" } },
        },
      },
    ];
    await elem.updateComplete;

    const ctaBlock = elem.shadowRoot?.querySelector("ds-cta-block");
    expect(ctaBlock).toBeTruthy();
  });

  it("should not render ds-cta-block in default variant", async () => {
    elem.variant = "default";
    elem.blocks = [
      {
        type: "cta",
        item: { type: "html", content: "<a href='#'>Go</a>" },
      },
    ];
    await elem.updateComplete;

    expect(elem.shadowRoot?.querySelector("ds-cta-block")).toBeNull();
  });
});
