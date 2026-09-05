import { describe, expect, it } from "vitest";
import {
  computed,
  emulate,
  mixedPage,
  PRAGMA_IS_SCOPED,
  pragmaPage,
  removalPage,
  render,
  SKIP_REASON,
  VANILLA_VERSIONS,
} from "./support/pages.js";

/** Each theme root's paragraph and the pragma page whose colour it must match. */
const THEME_PARAGRAPHS: ReadonlyArray<[string, "light" | "dark"]> = [
  ["theme-dark-p", "dark"],
  ["theme-dark-nested-p", "dark"],
  ["theme-strip-p", "dark"],
  ["theme-light-in-dark-p", "light"],
  ["theme-paper-p", "light"],
  ["ds-p", "light"],
];

describe.each(VANILLA_VERSIONS)("theme-bridge (Vanilla %s)", (version) => {
  it("pins the document light and derives each pragma root's scheme from Vanilla's nearest theme ancestor", async () => {
    const mixed = await render(mixedPage(version));
    expect(computed(mixed, mixed.documentElement).colorScheme).toBe("light");
    expect(computed(mixed, "ds-root").colorScheme).toBe("light");
    expect(computed(mixed, "theme-dark").colorScheme).toBe("dark");
    expect(computed(mixed, "theme-strip").colorScheme).toBe("dark");
    expect(computed(mixed, "theme-light-in-dark").colorScheme).toBe("light");
    expect(computed(mixed, "theme-paper").colorScheme).toBe("light");
    expect(computed(mixed, "theme-dark-nested").colorScheme).toBe("dark");
  });

  it("keeps the pin and the bridge under a dark operating system", async () => {
    await emulate({ colorScheme: "dark" });
    const mixed = await render(mixedPage(version));
    const light = await render(pragmaPage("light"));
    const dark = await render(pragmaPage("dark"));
    expect(
      mixed.defaultView?.matchMedia("(prefers-color-scheme: dark)").matches,
    ).toBe(true);
    expect(computed(mixed, mixed.documentElement).colorScheme).toBe("light");
    expect(computed(mixed, "ds-root").colorScheme).toBe("light");
    expect(computed(mixed, "theme-dark").colorScheme).toBe("dark");
    expect(computed(light, "ds-p").color).not.toBe(
      computed(dark, "ds-p").color,
    );
    expect(computed(mixed, "ds-p").color).toBe(computed(light, "ds-p").color);
  });

  // The colour is the resolved value of `--color-text`, a `light-dark()` token
  // whose computed value is the same text under both schemes; only the colour
  // shows which side was taken. It follows the scheme once pragma's territory
  // root declares `color: var(--color-text)` (VC.25); until then the root
  // inherits Vanilla's.
  it("resolves token colours in every theme case as on the matching pragma page", async (ctx) => {
    ctx.skip(!PRAGMA_IS_SCOPED, SKIP_REASON);
    const mixed = await render(mixedPage(version));
    const pages = {
      light: await render(pragmaPage("light")),
      dark: await render(pragmaPage("dark")),
    };
    for (const [id, theme] of THEME_PARAGRAPHS) {
      expect(computed(mixed, id).color, id).toBe(
        computed(pages[theme], "ds-p").color,
      );
    }
  });

  it("ignores a pragma theme class on a root inside a Vanilla page", async () => {
    const spec = mixedPage(version);
    const mixed = await render({
      ...spec,
      body: spec.body.replace(
        'class="ds card" id="ds-root"',
        'class="ds card dark" id="ds-root"',
      ),
    });
    expect(computed(mixed, "ds-root").colorScheme).toBe("light");
  });
});

describe("removal (README rule 19)", () => {
  it("keeps the pin on every root while the adapter outlives Vanilla, because the document has dropped `coexist`", async () => {
    const page = await render(removalPage());
    expect(computed(page, page.documentElement).colorScheme).toBe("light");
    expect(computed(page, "ds-root").colorScheme).toBe("light");
    expect(computed(page, "theme-dark").colorScheme).toBe("light");
  });

  it("lets every root follow the operating system if Vanilla is removed while `coexist` is still on the root", async () => {
    const page = await render(removalPage(false));
    expect(computed(page, page.documentElement).colorScheme).toBe("light");
    expect(computed(page, "ds-root").colorScheme).toBe("light dark");
    expect(computed(page, "theme-dark").colorScheme).toBe("light dark");
  });
});
