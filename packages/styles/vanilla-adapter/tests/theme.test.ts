import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  computed,
  mixedPage,
  PRAGMA_IS_SCOPED,
  pragmaPage,
  render,
  VANILLA_VERSIONS,
  type VanillaVersion,
} from "./support/pages.js";

afterEach(cleanup);

for (const version of Object.keys(VANILLA_VERSIONS) as VanillaVersion[]) {
  describe(`theme bridge (Vanilla ${version})`, () => {
    it("pins the mixed page light and derives each pragma root's scheme from Vanilla's nearest theme ancestor", async () => {
      const mixed = await render(mixedPage(version));
      expect(computed(mixed, "ds-root").colorScheme).toBe("light");
      expect(computed(mixed, "theme-dark").colorScheme).toBe("dark");
      expect(computed(mixed, "theme-strip").colorScheme).toBe("dark");
      expect(computed(mixed, "theme-light-in-dark").colorScheme).toBe("light");
      expect(computed(mixed, "theme-paper").colorScheme).toBe("light");
      expect(computed(mixed, "theme-dark-nested").colorScheme).toBe("dark");
    });

    // The colour follows the scheme only once pragma's territory root declares
    // `color: var(--color-text)` (VC.25); until then the root inherits Vanilla's.
    it.skipIf(!PRAGMA_IS_SCOPED)(
      "resolves token colours inside a dark Vanilla context as on pragma's dark page",
      async () => {
        const mixed = await render(mixedPage(version));
        const dark = await render(pragmaPage("dark"));
        const light = await render(pragmaPage("light"));
        expect(computed(mixed, "theme-dark-p").color).toBe(
          computed(dark, "ds-p").color,
        );
        expect(computed(mixed, "ds-p").color).toBe(
          computed(light, "ds-p").color,
        );
      },
    );

    it("ignores a pragma theme class on a root inside a Vanilla page", async () => {
      const spec = mixedPage(version);
      spec.body = spec.body.replace(
        'class="ds card" id="ds-root"',
        'class="ds card dark" id="ds-root"',
      );
      const mixed = await render(spec);
      expect(computed(mixed, "ds-root").colorScheme).toBe("light");
    });
  });
}
