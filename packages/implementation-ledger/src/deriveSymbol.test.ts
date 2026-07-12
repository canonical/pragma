import { describe, expect, it } from "vitest";
import { deriveAnnotatedSymbol } from "./deriveSymbol.js";
import { scanContent } from "./scanAnnotations.js";

function derive(content: string): ReturnType<typeof deriveAnnotatedSymbol> {
  const [annotation] = scanContent(content, "a.tsx");
  return deriveAnnotatedSymbol(content, annotation.index);
}

describe("deriveAnnotatedSymbol", () => {
  it("binds to the const declaration following the JSDoc", () => {
    const symbol = derive(
      [
        "/**",
        " * Buttons trigger actions.",
        " * @implements ds:global.component.button",
        " */",
        "const Button = ({ id }: Props) => null;",
        "export default Button;",
      ].join("\n"),
    );
    expect(symbol).toEqual({
      name: "Button",
      kind: "const",
      isTypeOnly: false,
    });
  });

  it("binds to exported function declarations", () => {
    const symbol = derive(
      [
        "/** @implements ds:global.component.icon */",
        "export function Icon() {}",
      ].join("\n"),
    );
    expect(symbol?.name).toBe("Icon");
  });

  it("marks interfaces as type-only", () => {
    const symbol = derive(
      [
        "/** @implements ds:global.component.tabs */",
        "export interface TabsProps { id: string }",
      ].join("\n"),
    );
    expect(symbol).toEqual({
      name: "TabsProps",
      kind: "interface",
      isTypeOnly: true,
    });
  });

  it("falls back to the enclosing exported declaration for object properties", () => {
    const symbol = derive(
      [
        "export const MODIFIER_FAMILIES = {",
        "  /** @implements ds:global.modifier_family.severity */",
        '  severity: ["neutral", "positive"],',
        "} as const;",
      ].join("\n"),
    );
    expect(symbol?.name).toBe("MODIFIER_FAMILIES");
  });

  it("supports line-comment annotations", () => {
    const symbol = derive(
      [
        "// @implements ds:global.component.chip",
        "export const Chip = () => null;",
      ].join("\n"),
    );
    expect(symbol?.name).toBe("Chip");
  });

  it("returns undefined when no symbol can be derived", () => {
    const symbol = derive("/** @implements ds:global.component.mystery */");
    expect(symbol).toBeUndefined();
  });
});
