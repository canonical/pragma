import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./CTABlock.js";
import type CTABlock from "./CTABlock.js";

describe("CTABlock component", () => {
  let elem: CTABlock;

  beforeEach(() => {
    elem = document.createElement("ds-cta-block") as CTABlock;
    document.body.appendChild(elem);
  });

  afterEach(() => {
    elem.remove();
  });

  it("should render component", async () => {
    await customElements.whenDefined("ds-cta-block");

    const container = elem.shadowRoot?.querySelector(".ds.cta-block");
    expect(container).toBeTruthy();
  });

  it("should have correct tag name", () => {
    expect(elem.tagName.toLowerCase()).toBe("ds-cta-block");
  });

  it("should render primary link", async () => {
    elem.primary = { content_html: "Get started", attrs: { href: "/start" } };
    await elem.updateComplete;

    const link = elem.shadowRoot?.querySelector('ds-link[variant="primary"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/start");
  });

  it("should render secondary links", async () => {
    elem.secondaries = [
      { content_html: "Docs", attrs: { href: "/docs" } },
      { content_html: "API", attrs: { href: "/api" } },
    ];
    await elem.updateComplete;

    const links = elem.shadowRoot?.querySelectorAll(
      'ds-link[variant="secondary"]',
    );
    expect(links?.length).toBe(2);
  });

  it("should render default link", async () => {
    elem.link = {
      content_html: "Learn more &rsaquo;",
      attrs: { href: "/more" },
    };
    await elem.updateComplete;

    const link = elem.shadowRoot?.querySelector('ds-link[variant="default"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/more");
  });

  it("should render all link types together", async () => {
    elem.primary = { content_html: "Primary", attrs: { href: "#" } };
    elem.secondaries = [{ content_html: "Secondary", attrs: { href: "#" } }];
    elem.link = { content_html: "Link", attrs: { href: "#" } };
    await elem.updateComplete;

    const allLinks = elem.shadowRoot?.querySelectorAll("ds-link");
    expect(allLinks?.length).toBe(3);
  });

  it("should render nothing when no props are set", async () => {
    await elem.updateComplete;

    const links = elem.shadowRoot?.querySelectorAll("ds-link");
    expect(links?.length).toBe(0);
  });
});
