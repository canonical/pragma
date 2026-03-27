import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./CtaBlock.js";
import type CtaBlock from "./CtaBlock.js";

describe("CtaBlock component", () => {
  let elem: CtaBlock;

  beforeEach(() => {
    elem = document.createElement("ds-cta-block") as CtaBlock;
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

  it("should render all three named slots", async () => {
    await elem.updateComplete;

    const slotNames = Array.from(
      elem.shadowRoot?.querySelectorAll("slot") ?? [],
    ).map((s) => s.name);
    expect(slotNames).toContain("primary");
    expect(slotNames).toContain("secondary");
    expect(slotNames).toContain("link");
  });

  it("should not render ds-button-link internally", async () => {
    await elem.updateComplete;

    expect(elem.shadowRoot?.querySelector("ds-button-link")).toBeNull();
  });

  it("should accept a ds-button-link in the primary slot", async () => {
    const link = document.createElement("ds-button-link");
    link.slot = "primary";
    link.setAttribute("variant", "primary");
    link.textContent = "Get started";
    elem.appendChild(link);
    await elem.updateComplete;

    const slotted = elem.querySelector('[slot="primary"]');
    expect(slotted?.tagName.toLowerCase()).toBe("ds-button-link");
  });
});
