import { describe, expect, it } from "vitest";
import {
  adapterCss,
  computed,
  differences,
  idsIn,
  importantDeclarations,
  layerNames,
  layersCss,
  mixedPage,
  PRAGMA_CSS,
  PRAGMA_IS_SCOPED,
  parse,
  render,
  SKIP_REASON,
  stylesCss,
} from "./support/pages.js";

const MIXED_ORDER = [
  "vanilla",
  "boundary",
  "normalize",
  "ds.tokens",
  "ds.reset",
  "ds.typography",
  "ds.modifiers",
  "ds.surfaces",
  "ds.states",
  "adapter",
  "ds.components",
  "ds.components.global",
  "ds.components.app",
  "app",
];

const ADAPTER_ONLY = ["vanilla", "boundary", "adapter", "app"];

/** Whether a layer name is one of the declared ones or a sublayer of one. */
const isDeclared = (name: string): boolean =>
  MIXED_ORDER.some(
    (declared) => name === declared || name.startsWith(`${declared}.`),
  );

describe("the order contract", () => {
  it("layers.css is a single statement naming the fourteen layers in order", () => {
    const sheet = parse(layersCss);
    expect(sheet.cssRules.length).toBe(1);
    expect(sheet.cssRules[0]).toBeInstanceOf(CSSLayerStatementRule);
    expect(layerNames(layersCss)).toEqual(MIXED_ORDER);
  });

  it("adapter.css is the boundary block and the bridge block, and Chromium keeps the boundary's list whole", () => {
    const blocks = Array.from(parse(adapterCss).cssRules).filter(
      (rule): rule is CSSLayerBlockRule => rule instanceof CSSLayerBlockRule,
    );
    expect(blocks.map((block) => block.name)).toEqual(["boundary", "adapter"]);
    const [boundary, bridge] = blocks;
    // Chromium drops the Gecko-only rules one by one, as designed, and must
    // never drop the list that names the WebKit parts and the placeholder.
    const list = boundary?.cssRules[0];
    expect(list).toBeInstanceOf(CSSStyleRule);
    if (!(list instanceof CSSStyleRule)) return;
    expect(list.selectorText).toContain("::placeholder");
    expect(list.selectorText).toContain("::-webkit-slider-thumb");
    expect(list.style.cssText).toBe("all: revert;");
    const rule = bridge?.cssRules[0];
    expect(rule).toBeInstanceOf(CSSStyleRule);
    if (!(rule instanceof CSSStyleRule)) return;
    expect(bridge?.cssRules.length).toBe(1);
    expect(rule.style.colorScheme).toBe(
      "var(--vf-theme-light, light) var(--vf-theme-dark, dark)",
    );
  });

  it("every layer pragma's CSS uses is in the statement, and none is anonymous", () => {
    const names = layerNames(PRAGMA_CSS);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !isDeclared(name))).toEqual([]);
  });

  it("pragma's CSS carries no !important (README rule 17)", () => {
    expect(importantDeclarations(PRAGMA_CSS)).toEqual([]);
    expect(PRAGMA_CSS.match(/!\s*important/gi) ?? []).toEqual([]);
  });

  it("@canonical/styles opens with its own statement, the mixed order minus the adapter's layers", (ctx) => {
    ctx.skip(!PRAGMA_IS_SCOPED, SKIP_REASON);
    const first = parse(stylesCss).cssRules[0];
    expect(first).toBeInstanceOf(CSSLayerStatementRule);
    if (!(first instanceof CSSLayerStatementRule)) return;
    expect(Array.from(first.nameList)).toEqual(
      MIXED_ORDER.filter((name) => !ADAPTER_ONLY.includes(name)),
    );
  });

  it("order-independence: adapter.css may sit anywhere inside the pragma entry", async () => {
    const spec = mixedPage("4.58", { adapter: "after" });
    const after = await render(spec);
    const before = await render(mixedPage("4.58", { adapter: "before" }));
    const failures = idsIn(spec.body).flatMap((id) =>
      differences(`#${id}`, computed(after, id), computed(before, id)),
    );
    expect(failures).toEqual([]);
  });
});
