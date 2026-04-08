import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isEventTargetInElement } from "./isEventTargetInElement";

describe("isEventTargetInElement", () => {
  let parentElement: HTMLDivElement;
  let childElement: HTMLSpanElement;
  let siblingElement: HTMLDivElement;

  beforeEach(() => {
    // Create DOM elements for testing
    parentElement = document.createElement("div");
    childElement = document.createElement("span");
    siblingElement = document.createElement("div");

    parentElement.appendChild(childElement);
    document.body.appendChild(parentElement);
    document.body.appendChild(siblingElement);
  });

  afterEach(() => {
    // Clean up DOM
    document.body.removeChild(parentElement);
    document.body.removeChild(siblingElement);
  });

  it("should return true when eventTarget is the same as element", () => {
    const result = isEventTargetInElement(parentElement, parentElement);
    expect(result).toBe(true);
  });

  it("should return true when eventTarget is contained within element", () => {
    const result = isEventTargetInElement(childElement, parentElement);
    expect(result).toBe(true);
  });

  it("should return false when eventTarget is not contained within element", () => {
    const result = isEventTargetInElement(siblingElement, parentElement);
    expect(result).toBe(false);
  });

  it("should return false when eventTarget is null", () => {
    const result = isEventTargetInElement(null, parentElement);
    expect(result).toBe(false);
  });

  it("should return false when element is undefined", () => {
    const result = isEventTargetInElement(childElement, undefined);
    expect(result).toBe(false);
  });

  it("should return false when both eventTarget and element are null/undefined", () => {
    const result = isEventTargetInElement(null, undefined);
    expect(result).toBe(false);
  });

  it("should handle deeply nested elements", () => {
    const deepChild = document.createElement("button");
    const middleChild = document.createElement("div");

    middleChild.appendChild(deepChild);
    childElement.appendChild(middleChild);

    const result = isEventTargetInElement(deepChild, parentElement);
    expect(result).toBe(true);
  });
});
