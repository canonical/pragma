import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  computed,
  diffComputed,
  idsIn,
  mixedPage,
  PRAGMA_IS_SCOPED,
  render,
  VANILLA_BLOCK,
  VANILLA_VERSIONS,
  type VanillaVersion,
  vanillaPage,
} from "./support/pages.js";

afterEach(cleanup);

for (const version of Object.keys(VANILLA_VERSIONS) as VanillaVersion[]) {
  describe(`Vanilla territory (Vanilla ${version})`, () => {
    it("is not changed by the adapter's two files", async () => {
      const withAdapter = await render(mixedPage(version));
      const without = await render(mixedPage(version, { adapter: "none" }));
      const failures: string[] = [];
      for (const id of [...idsIn(VANILLA_BLOCK)]) {
        for (const { property, left, right } of diffComputed(
          computed(withAdapter, id),
          computed(without, id),
        )) {
          failures.push(`#${id} ${property}: ${left} != ${right}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it("keeps Vanilla's root rules and custom properties", async () => {
      const mixed = await render(mixedPage(version));
      const view = mixed.defaultView as Window;
      const root = view.getComputedStyle(mixed.documentElement);
      expect(root.getPropertyValue("--vf-color-text-default").trim()).not.toBe(
        "",
      );
      expect(root.boxSizing).toBe("border-box");
      // Vanilla's root line-height loses to pragma's unlayered normalize until
      // the scoped release (D1); asserted only from then on.
      if (PRAGMA_IS_SCOPED) expect(root.lineHeight).toBe("24px");
    });

    for (const width of [1280, 1700]) {
      it.skipIf(!PRAGMA_IS_SCOPED)(
        `equals the Vanilla-only page for every longhand at ${width}px`,
        async () => {
          const mixed = await render(mixedPage(version), width);
          const vanilla = await render(vanillaPage(version), width);
          const failures: string[] = [];
          for (const id of idsIn(VANILLA_BLOCK)) {
            for (const { property, left, right } of diffComputed(
              computed(mixed, id),
              computed(vanilla, id),
            )) {
              failures.push(`#${id} ${property}: ${left} != ${right}`);
            }
          }
          expect(failures).toEqual([]);
        },
      );
    }
  });
}
