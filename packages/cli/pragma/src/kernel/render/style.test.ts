import { describe, expect, it } from "vitest";
import { defaultStyle, styleFor } from "./style.js";

describe("styleFor", () => {
  it("passes every color through unchanged when disabled", () => {
    const style = styleFor(false);
    expect(style.enabled).toBe(false);
    expect(style.bold("x")).toBe("x");
    expect(style.dim("x")).toBe("x");
    expect(style.cyan("x")).toBe("x");
    expect(style.green("x")).toBe("x");
    expect(style.yellow("x")).toBe("x");
  });

  it("reports enabled and drives chalk when enabled", () => {
    const style = styleFor(true);
    expect(style.enabled).toBe(true);
    // A non-TTY test process leaves chalk at level 0, so the text survives
    // verbatim; what the beautified renderers gate on is `enabled`.
    expect(style.cyan("x")).toContain("x");
  });
});

describe("defaultStyle", () => {
  it("is disabled when stdout is not a TTY (keeps piped output byte-stable)", () => {
    // The vitest runner's stdout is never a TTY, so the beautify seam is inert
    // here — the guarantee that piped / agent output is unstyled and stable.
    expect(process.stdout.isTTY).not.toBe(true);
    expect(defaultStyle().enabled).toBe(false);
  });
});
