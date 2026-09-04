import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  computed,
  diffComputed,
  idsIn,
  mixedPage,
  PRAGMA_BLOCK,
  PRAGMA_IS_SCOPED,
  pragmaPage,
  render,
  VANILLA_VERSIONS,
  type VanillaVersion,
} from "./support/pages.js";

afterEach(cleanup);

/** The properties Vanilla sets on bare elements and pragma leaves to the browser. */
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

for (const version of Object.keys(VANILLA_VERSIONS) as VanillaVersion[]) {
  describe(`territory (Vanilla ${version})`, () => {
    it("reverts Vanilla's declarations on every element inside pragma territory", async () => {
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      const failures: string[] = [];
      for (const id of idsIn(PRAGMA_BLOCK)) {
        const left = computed(mixed, id);
        const right = computed(pragma, id);
        for (const property of LEAK_PROPERTIES) {
          // Chromium gives table cells their 1px default padding as a
          // presentational hint, which `revert` rolls back (VC.29); the
          // table's width follows from it. Stated in the README.
          if (
            (id === "ds-th" || id === "ds-td") &&
            property.startsWith("padding")
          )
            continue;
          if (id === "ds-table" && property === "width") continue;
          const a = left.getPropertyValue(property);
          const b = right.getPropertyValue(property);
          if (a !== b) failures.push(`#${id} ${property}: ${a} != ${b}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it("reverts Vanilla's placeholder colour inside pragma territory", async () => {
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      expect(computed(mixed, "ds-input", "::placeholder").color).toBe(
        computed(pragma, "ds-input", "::placeholder").color,
      );
      // and Vanilla territory keeps Vanilla's
      expect(computed(mixed, "vf-input", "::placeholder").color).not.toBe(
        computed(pragma, "ds-input", "::placeholder").color,
      );
    });

    it("leaves inline SVG inside pragma territory drawing with its attributes", async () => {
      const mixed = await render(mixedPage(version));
      const rect = computed(mixed, "ds-rect");
      expect(rect.fill).toBe("rgb(255, 0, 0)");
      expect(rect.width).toBe("8px");
    });

    it("does not style the pragma root itself with Vanilla", async () => {
      const mixed = await render(mixedPage(version));
      const pragma = await render(pragmaPage());
      for (const property of LEAK_PROPERTIES) {
        expect(
          computed(mixed, "ds-button").getPropertyValue(property),
          property,
        ).toBe(computed(pragma, "ds-button").getPropertyValue(property));
      }
    });

    it("renders Vanilla markup inside pragma territory with browser defaults", async () => {
      const mixed = await render(mixedPage(version));
      const input = computed(mixed, "neg-input");
      expect(input.marginBottom).toBe("0px");
      expect(input.minWidth).toBe("0px");
      expect(computed(mixed, "neg-label").display).toBe("inline");
    });

    it("reverts every Vanilla rule once the document root carries `ds`", async () => {
      const flipped = await render(
        mixedPage(version, { root: "ds app comfortable light" }),
      );
      expect(computed(flipped, "vf-input").marginBottom).toBe("0px");
      expect(computed(flipped, "vf-button").marginBottom).toBe("0px");
      expect(computed(flipped, "vf-p").maxWidth).toBe("none");
    });

    it.skipIf(!PRAGMA_IS_SCOPED)(
      "computes every longhand inside pragma territory as on a pragma-only page",
      async () => {
        const mixed = await render(mixedPage(version));
        const pragma = await render(pragmaPage());
        const failures: string[] = [];
        for (const id of idsIn(PRAGMA_BLOCK)) {
          for (const { property, left, right } of diffComputed(
            computed(mixed, id),
            computed(pragma, id),
          )) {
            failures.push(`#${id} ${property}: ${left} != ${right}`);
          }
        }
        expect(failures).toEqual([]);
      },
    );
  });
}
