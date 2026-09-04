import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  computed,
  diffComputed,
  idsIn,
  layerNames,
  layersCss,
  mixedPage,
  PRAGMA_BLOCK,
  PRAGMA_IS_SCOPED,
  render,
  stylesCss,
} from "./support/pages.js";

afterEach(cleanup);

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
  "app",
];

const ADAPTER_ONLY = ["vanilla", "boundary", "adapter", "app"];

/** Whether a layer name is one of the declared ones or a sublayer of one. */
const isDeclared = (name: string): boolean =>
  MIXED_ORDER.some(
    (declared) => name === declared || name.startsWith(`${declared}.`),
  );

describe("the order contract", () => {
  it("layers.css is a single statement naming the twelve layers in order", () => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(layersCss);
    expect(sheet.cssRules.length).toBe(1);
    const rule = sheet.cssRules[0];
    expect(rule).toBeInstanceOf(CSSLayerStatementRule);
    expect([...(rule as CSSLayerStatementRule).nameList]).toEqual(MIXED_ORDER);
  });

  it("every layer @canonical/styles uses is in the statement", () => {
    const names = layerNames(stylesCss);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !isDeclared(name))).toEqual([]);
  });

  it.skipIf(!PRAGMA_IS_SCOPED)(
    "@canonical/styles' own statement is the mixed order minus the adapter's layers",
    () => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(stylesCss);
      const statement = [...sheet.cssRules].find(
        (rule) => rule instanceof CSSLayerStatementRule,
      ) as CSSLayerStatementRule | undefined;
      expect(statement).toBeDefined();
      expect([...(statement as CSSLayerStatementRule).nameList]).toEqual(
        MIXED_ORDER.filter((name) => !ADAPTER_ONLY.includes(name)),
      );
    },
  );

  it("does not depend on where adapter.css sits inside the pragma entry", async () => {
    const after = await render(mixedPage("4.58", { adapter: "after" }));
    const before = await render(mixedPage("4.58", { adapter: "before" }));
    const failures: string[] = [];
    for (const id of idsIn(PRAGMA_BLOCK)) {
      for (const { property, left, right } of diffComputed(
        computed(after, id),
        computed(before, id),
      )) {
        failures.push(`#${id} ${property}: ${left} != ${right}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
