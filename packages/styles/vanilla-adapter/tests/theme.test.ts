import { describe, expect, it } from "vitest";
import {
  computed,
  emulate,
  mixedPage,
  pragmaPage,
  removalPage,
  render,
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
  // shows which side was taken. It follows the scheme because the island root
  // declares `color: var(--color-text)` in the confined copy (VC.25).
  it("resolves token colours in every theme case as on the matching pragma page", async () => {
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

  it("lets a component that sets its own scheme beat the bridge", async () => {
    // `ds.adapter` sits below the component tiers, so a component's own
    // `color-scheme` wins on its island, under any Vanilla theme and over
    // pragma's theme classes too.
    const spec = mixedPage(version);
    const mixed = await render({
      ...spec,
      styles: [
        ...spec.styles,
        "@layer ds.components.global { .ds.modal { color-scheme: dark } }",
      ],
      body: `${spec.body}<div class="ds modal" id="theme-component"></div><div class="is-dark"><div class="ds modal light" id="theme-component-in-dark"></div></div>`,
    });
    expect(computed(mixed, "theme-component").colorScheme).toBe("dark");
    expect(computed(mixed, "theme-component-in-dark").colorScheme).toBe("dark");
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
  it("removes Vanilla and this package in one change, and every root then follows pragma's theme classes", async () => {
    const page = await render(removalPage("styles"));
    expect(computed(page, page.documentElement).colorScheme).toBe("light");
    expect(computed(page, "ds-root").colorScheme).toBe("light");
    expect(computed(page, "ds-nested").colorScheme).toBe("light");
    expect(computed(page, "theme-dark").colorScheme).toBe("light");
    expect(computed(page, "removal-dark").colorScheme).toBe("dark");
  });

  it("computes `light dark` on every island in the unsupported arrangement, this package loaded with Vanilla gone", async () => {
    // Not a step of the migration: this package stays until Vanilla is gone
    // and the two leave together (VC.34). Recorded because a page that reaches
    // it by accident looks like this. No Vanilla theme is left for the bridge
    // to read, so it writes pragma's default, `light dark`, on every outermost
    // island; the pin on <html> does not reach them, and a nested root
    // inherits from its island.
    const page = await render(removalPage("adapter"));
    expect(computed(page, page.documentElement).colorScheme).toBe("light");
    expect(computed(page, "ds-root").colorScheme).toBe("light dark");
    expect(computed(page, "ds-nested").colorScheme).toBe("light dark");
    expect(computed(page, "theme-dark").colorScheme).toBe("light dark");
    expect(computed(page, "removal-dark").colorScheme).toBe("light dark");
  });

  it("renders the islands dark under a dark operating system in that same unsupported arrangement", async () => {
    await emulate({ colorScheme: "dark" });
    const page = await render(removalPage("adapter"));
    const dark = await render(pragmaPage("dark"));
    const light = await render(pragmaPage("light"));
    expect(computed(page, page.documentElement).colorScheme).toBe("light");
    expect(computed(page, "ds-p").color).toBe(computed(dark, "ds-p").color);
    expect(computed(page, "ds-p").color).not.toBe(
      computed(light, "ds-p").color,
    );
  });
});
