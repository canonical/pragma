import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./Link.js";
import type Link from "./Link.js";

describe("Link component", () => {
  let elem: Link;

  beforeEach(() => {
    elem = document.createElement("ds-link") as Link;
    document.body.appendChild(elem);
  });

  afterEach(() => {
    elem.remove();
  });

  it("should render component", async () => {
    await customElements.whenDefined("ds-link");

    const anchor = elem.shadowRoot?.querySelector("a.ds.link");
    expect(anchor).toBeTruthy();
  });

  it("should have correct tag name", () => {
    expect(elem.tagName.toLowerCase()).toBe("ds-link");
  });

  it("should render an anchor element", async () => {
    await elem.updateComplete;

    expect(elem.shadowRoot?.querySelector("a")).toBeTruthy();
  });

  it("should apply default variant class by default", async () => {
    await elem.updateComplete;

    const anchor = elem.shadowRoot?.querySelector("a");
    expect(anchor?.classList.contains("default")).toBe(true);
  });

  it("should apply primary variant class", async () => {
    elem.variant = "primary";
    await elem.updateComplete;

    const anchor = elem.shadowRoot?.querySelector("a");
    expect(anchor?.classList.contains("primary")).toBe(true);
  });

  it("should apply secondary variant class", async () => {
    elem.variant = "secondary";
    await elem.updateComplete;

    const anchor = elem.shadowRoot?.querySelector("a");
    expect(anchor?.classList.contains("secondary")).toBe(true);
  });

  it("should set href on anchor", async () => {
    elem.href = "https://ubuntu.com";
    await elem.updateComplete;

    const anchor = elem.shadowRoot?.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("https://ubuntu.com");
  });

  it("should set target on anchor when provided", async () => {
    elem.target = "_blank";
    await elem.updateComplete;

    const anchor = elem.shadowRoot?.querySelector("a");
    expect(anchor?.getAttribute("target")).toBe("_blank");
  });

  it("should not set aria-label when not provided", async () => {
    await elem.updateComplete;

    const anchor = elem.shadowRoot?.querySelector("a");
    expect(anchor?.hasAttribute("aria-label")).toBe(false);
  });

  it("should set aria-label when provided", async () => {
    elem.ariaLabel = "Download Ubuntu Server";
    await elem.updateComplete;

    const anchor = elem.shadowRoot?.querySelector("a");
    expect(anchor?.getAttribute("aria-label")).toBe("Download Ubuntu Server");
  });
});
