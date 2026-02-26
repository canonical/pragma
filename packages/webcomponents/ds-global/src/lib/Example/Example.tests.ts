import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./Example.js";
import Example from "./Example.js";

describe("Example component", () => {
  let elem: Example;

  beforeEach(() => {
    elem = document.createElement("ds-example") as Example;
    document.body.appendChild(elem);
  });

  afterEach(() => {
    elem.remove();
  });

  it("should render component", async () => {
    await customElements.whenDefined("ds-example");

    const container = elem.shadowRoot?.querySelector(".ds.example");
    expect(container).toBeTruthy();
  });

  it("should have correct tag name", () => {
    expect(elem.tagName.toLowerCase()).toBe("ds-example");
  });

  it("should render default label", async () => {
    await customElements.whenDefined("ds-example");
    await elem.updateComplete;

    const container = elem.shadowRoot?.querySelector(".ds.example");
    expect(container?.textContent?.trim()).toBe("Example");
  });

  it("should render custom label", async () => {
    elem.label = "Custom Label";
    await elem.updateComplete;

    const container = elem.shadowRoot?.querySelector(".ds.example");
    expect(container?.textContent?.trim()).toBe("Custom Label");
  });

  it("should apply variant class", async () => {
    elem.variant = "outlined";
    await elem.updateComplete;

    const container = elem.shadowRoot?.querySelector(".ds.example");
    expect(container?.classList.contains("outlined")).toBe(true);
  });

  it("should not apply variant class when undefined", async () => {
    await elem.updateComplete;

    const container = elem.shadowRoot?.querySelector(".ds.example");
    expect(container?.classList.contains("outlined")).toBe(false);
  });

  it("should render slotted content", async () => {
    const slottedText = document.createTextNode("Slotted content");
    elem.appendChild(slottedText);
    await elem.updateComplete;

    const slot = elem.shadowRoot?.querySelector("slot");
    expect(slot).toBeTruthy();
  });

  it("should update label when attribute changes", async () => {
    elem.setAttribute("label", "Updated Label");
    await elem.updateComplete;

    expect(elem.label).toBe("Updated Label");
    const container = elem.shadowRoot?.querySelector(".ds.example");
    expect(container?.textContent?.trim()).toBe("Updated Label");
  });
});
