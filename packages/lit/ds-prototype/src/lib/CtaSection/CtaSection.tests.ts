import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./CtaSection.js";
import type CtaSection from "./CtaSection.js";

describe("CtaSection component", () => {
  let elem: CtaSection;

  beforeEach(() => {
    elem = document.createElement("ds-cta-section") as CtaSection;
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

  it("should render grid-row wrapper when layout is 25-75", async () => {
    elem.layout = "25-75";
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

  it("should render description slot for block variant", async () => {
    elem.variant = "block";
    await elem.updateComplete;

    const descSlot = elem.shadowRoot?.querySelector('slot[name="description"]');
    expect(descSlot).toBeTruthy();
  });

  it("should render cta slot for block variant", async () => {
    elem.variant = "block";
    await elem.updateComplete;

    const ctaSlot = elem.shadowRoot?.querySelector('slot[name="cta"]');
    expect(ctaSlot).toBeTruthy();
  });

  it("should render cta slot for default variant", async () => {
    elem.variant = "default";
    await elem.updateComplete;

    const ctaSlot = elem.shadowRoot?.querySelector('slot[name="cta"]');
    expect(ctaSlot).toBeTruthy();
  });

  it("should not render ds-cta-block internally in shadow DOM", async () => {
    elem.variant = "block";
    await elem.updateComplete;

    expect(elem.shadowRoot?.querySelector("ds-cta-block")).toBeNull();
  });
});
