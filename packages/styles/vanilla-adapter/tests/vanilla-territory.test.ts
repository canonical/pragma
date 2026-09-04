import { describe, expect, it } from "vitest";
import {
  computed,
  differences,
  idsIn,
  isLayoutOutput,
  mixedPage,
  PRAGMA_IS_SCOPED,
  render,
  SKIP_REASON,
  VANILLA_BLOCK,
  VANILLA_VERSIONS,
  vanillaPage,
} from "./support/pages.js";

/**
 * The document is pinned `light` from day one (README rule 10), and the Vanilla-
 * only page, the site before pragma, carries no pin: `color-scheme` differs by
 * design on every element. The pin itself is asserted in theme.test.ts.
 */
const isPin = (property: string): boolean => property === "color-scheme";

/** The root and the body also differ in the size their content gives them. */
const isPinOrContent = (property: string): boolean =>
  isPin(property) || isLayoutOutput(property);

describe.each(VANILLA_VERSIONS)(
  "vanilla-territory-untouched (Vanilla %s)",
  (version) => {
    it("is not changed by adapter.css", async () => {
      const withAdapter = await render(mixedPage(version));
      const without = await render(mixedPage(version, { adapter: "none" }));
      const failures = idsIn(VANILLA_BLOCK).flatMap((id) =>
        differences(`#${id}`, computed(withAdapter, id), computed(without, id)),
      );
      expect(failures).toEqual([]);
    });

    it("keeps Vanilla's root rules and custom properties", async () => {
      const mixed = await render(mixedPage(version));
      const root = computed(mixed, mixed.documentElement);
      expect(root.getPropertyValue("--vf-color-text-default").trim()).not.toBe(
        "",
      );
      expect(root.boxSizing).toBe("border-box");
    });

    it("keeps Vanilla's root line-height", async (ctx) => {
      // It loses to pragma's unlayered normalize until the scoped release (D1).
      ctx.skip(!PRAGMA_IS_SCOPED, SKIP_REASON);
      const mixed = await render(mixedPage(version));
      expect(computed(mixed, mixed.documentElement).lineHeight).toBe("24px");
    });

    it.for([1280, 1700])(
      "equals the Vanilla-only page for every longhand at %ipx, html and body included",
      async (width, ctx) => {
        ctx.skip(!PRAGMA_IS_SCOPED, SKIP_REASON);
        const mixed = await render(mixedPage(version), width);
        const vanilla = await render(vanillaPage(version), width);
        const failures = [
          ...differences(
            "html",
            computed(mixed, mixed.documentElement),
            computed(vanilla, vanilla.documentElement),
            isPinOrContent,
          ),
          ...differences(
            "body",
            computed(mixed, mixed.body),
            computed(vanilla, vanilla.body),
            isPinOrContent,
          ),
          ...idsIn(VANILLA_BLOCK).flatMap((id) =>
            differences(
              `#${id}`,
              computed(mixed, id),
              computed(vanilla, id),
              isPin,
            ),
          ),
        ];
        expect(failures).toEqual([]);
      },
    );
  },
);
