import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "./Example.js";

describe("MyElement component", () => {
  let elem: HTMLElement;

  beforeEach(() => {
    elem = document.createElement("my-element");
    document.body.appendChild(elem);
  });

  it("should render component", async () => {
    await customElements.whenDefined("my-element");

    const paragraph = elem.shadowRoot?.querySelector("p");
    expect(paragraph).toBeTruthy();
    expect(paragraph?.textContent?.trim()).toBe("This is a web component");
  });

  afterEach(() => {
    elem.remove();
  });
});
