import { describe, expect, it } from "vitest";
import {
  computed,
  differences,
  emulate,
  idsIn,
  isExpectedDifference,
  MOTION_SKIP_REASON,
  mixedPage,
  PRAGMA_BLOCK,
  PRAGMA_HONOURS_REDUCED_MOTION,
  PRAGMA_IS_SCOPED,
  pragmaPage,
  render,
  SKIP_REASON,
  VANILLA_VERSIONS,
  vanillaPage,
} from "./support/pages.js";

/**
 * The properties Vanilla sets on bare elements and pragma leaves to the browser.
 * Without the boundary these pairs differ on the mixed page: the `p` and `h2`
 * max-width and the widths that follow, the input's and textarea's appearance,
 * the select's and textarea's min-width, the textarea's vertical alignment, the
 * label's margin and width, the table's layout, the cells' alignment, overflow
 * and padding, the link's underline, the rule's borders and background, the
 * list's margins and padding. With it, only the cells' padding, reverted to
 * the browser's 0px: the one difference VC.29 states, accepted by name.
 */
const LEAK_PROPERTIES = [
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "width",
  "min-width",
  "min-height",
  "max-width",
  "border-bottom-width",
  "border-top-width",
  "background-color",
  "background-image",
  "appearance",
  "display",
  "list-style-type",
  "vertical-align",
  "text-overflow",
  "overflow-x",
  "table-layout",
  "border-collapse",
  "font-style",
  "letter-spacing",
  "text-decoration-line",
];

/**
 * What a pragma root inherits from the page around it. The boundary cannot
 * revert inheritance; pragma's territory root declares these (VC.25), and this
 * list is the property set that declaration must cover.
 */
const ROOT_INHERITED = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "color",
  "box-sizing",
  "-webkit-font-smoothing",
  "text-wrap-style",
  "text-wrap-mode",
];

const compare = (
  left: Document,
  right: Document,
  properties: readonly string[],
): string[] => {
  const failures: string[] = [];
  for (const id of idsIn(PRAGMA_BLOCK)) {
    const a = computed(left, id);
    const b = computed(right, id);
    for (const property of properties) {
      const x = a.getPropertyValue(property);
      const y = b.getPropertyValue(property);
      if (x !== y && !isExpectedDifference(id, property, x, y))
        failures.push(`#${id} ${property}: ${x} != ${y}`);
    }
  }
  return failures;
};

describe.each(VANILLA_VERSIONS)(
  "territory-equals-pragma-only (Vanilla %s)",
  (version) => {
    it("reverts Vanilla's declarations on every element inside pragma territory", async () => {
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      expect(compare(mixed, pragma, LEAK_PROPERTIES)).toEqual([]);
    });

    it("reverts Vanilla's placeholder colour inside pragma territory", async () => {
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      const vanilla = await render(vanillaPage(version));
      expect(computed(mixed, "ds-input", "::placeholder").color).toBe(
        computed(pragma, "ds-input", "::placeholder").color,
      );
      expect(computed(mixed, "vf-input", "::placeholder").color).toBe(
        computed(vanilla, "vf-input", "::placeholder").color,
      );
    });

    it("leaves inline SVG inside pragma territory drawing with its attributes", async () => {
      const mixed = await render(mixedPage(version));
      const rect = computed(mixed, "ds-rect");
      expect(rect.fill).toBe("rgb(255, 0, 0)");
      expect(rect.width).toBe("8px");
    });

    it("root-not-styled: a pragma root placed directly in a Vanilla container loses that container's child rules, a wrapper keeps them", async () => {
      const mixed = await render(mixedPage(version));
      // The same page without the adapter is the control: there the roots
      // are placed like any child, which is what the boundary takes away.
      const control = await render(mixedPage(version, { adapter: "none" }));
      // An inline form spaces its direct children.
      expect(computed(mixed, "place-wrapper").marginRight).toBe("24px");
      expect(computed(mixed, "place-direct").marginRight).toBe("0px");
      expect(computed(control, "place-direct").marginRight).toBe("24px");
      expect(computed(mixed, "place-wrapped").marginRight).toBe("0px");
      // A grid row places a child by its column class; on a pragma root the
      // class is reverted with the rest, which is why rule 8 says to wrap.
      expect(computed(mixed, "place-col").gridColumnEnd).toBe("span 6");
      expect(computed(mixed, "place-col-direct").gridColumnEnd).toBe("auto");
      expect(computed(control, "place-col-direct").gridColumnEnd).toBe(
        "span 6",
      );
    });

    it("renders Vanilla markup inside pragma territory without Vanilla's styles", async () => {
      const mixed = await render(mixedPage(version));
      const input = computed(mixed, "neg-input");
      expect(input.marginBottom).toBe("0px");
      expect(input.minWidth).toBe("0px");
      expect(computed(mixed, "neg-label").display).toBe("inline");
    });

    it("reverts every Vanilla rule once the document root drops `coexist`", async () => {
      const flipped = await render(
        mixedPage(version, { root: "app comfortable light" }),
      );
      expect(computed(flipped, "vf-input").marginBottom).toBe("0px");
      expect(computed(flipped, "vf-button").marginBottom).toBe("0px");
      expect(computed(flipped, "vf-p").maxWidth).toBe("none");
    });

    it("animates nothing under a reduced-motion preference, on either page", async (ctx) => {
      // Vanilla says `transition: none` with `!important`; pragma zeroes its
      // motion tokens. The property lists differ, the behaviour must not: every
      // duration inside pragma territory is 0s on both pages.
      ctx.skip(!PRAGMA_HONOURS_REDUCED_MOTION, MOTION_SKIP_REASON);
      await emulate({ reducedMotion: "reduce" });
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      expect(
        mixed.defaultView?.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
      ).toBe(true);
      const failures: string[] = [];
      for (const [name, doc] of [
        ["mixed", mixed],
        ["pragma", pragma],
      ] as const) {
        for (const id of idsIn(PRAGMA_BLOCK)) {
          const style = computed(doc, id);
          for (const property of [
            "transition-duration",
            "animation-duration",
          ]) {
            const values = style.getPropertyValue(property).split(",");
            if (values.some((value) => value.trim() !== "0s"))
              failures.push(`${name} #${id} ${property}: ${values.join(",")}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it("inherits pragma's baseline at the root, not Vanilla's", async (ctx) => {
      ctx.skip(!PRAGMA_IS_SCOPED, SKIP_REASON);
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      expect(compare(mixed, pragma, ROOT_INHERITED)).toEqual([]);
    });

    it("computes every longhand inside pragma territory as on a pragma-only page", async (ctx) => {
      ctx.skip(!PRAGMA_IS_SCOPED, SKIP_REASON);
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      const failures = idsIn(PRAGMA_BLOCK).flatMap((id) =>
        differences(
          `#${id}`,
          computed(mixed, id),
          computed(pragma, id),
          (property, a, b) => isExpectedDifference(id, property, a, b),
        ),
      );
      expect(failures).toEqual([]);
    });
  },
);
