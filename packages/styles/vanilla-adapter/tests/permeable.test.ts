import { describe, expect, it } from "vitest";
import {
  computed,
  differences,
  idsIn,
  isLayoutOutput,
  mixedPage,
  PRAGMA_BLOCK,
  pragmaPage,
  render,
  VANILLA_VERSIONS,
  vanillaPage,
} from "./support/pages.js";

/**
 * A layout root that opts out of reach into its children: a plain Vanilla
 * heading, paragraph and button, and a pragma card nested inside it. The
 * `.ds` root that a bare pragma component needs to compose is absent here on
 * purpose, because none of these plain elements are meant to become one.
 */
const PERMEABLE_BLOCK = `
<div class="ds grid ds-permeable" id="perm-root">
  <h2 id="perm-h2">Heading</h2>
  <p id="perm-p">Paragraph</p>
  <button id="perm-button" class="p-button">Button</button>
  <div class="ds card" id="perm-nested"><p id="perm-nested-p">nested</p></div>
</div>`;

/** The same Vanilla elements with no pragma root around them at all, so a
 * "left alone" claim has a page to compare against. */
const PERMEABLE_VANILLA_ONLY = `
<div id="perm-root">
  <h2 id="perm-h2">Heading</h2>
  <p id="perm-p">Paragraph</p>
  <button id="perm-button" class="p-button">Button</button>
</div>`;

/**
 * What a root inherits from the page around it, mirrored from
 * territory.test.ts: the confined copy's baseline, not anything the layout
 * preset itself declares.
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

describe.each(VANILLA_VERSIONS)("ds-permeable (Vanilla %s)", (version) => {
  it("still gives the permeable root itself the confined baseline", async () => {
    const mixed = await render(
      mixedPage(version, { body: PRAGMA_BLOCK + PERMEABLE_BLOCK }),
    );
    const pragma = await render(pragmaPage());
    const failures: string[] = [];
    for (const property of ROOT_INHERITED) {
      const a = computed(mixed, "perm-root").getPropertyValue(property);
      const b = computed(pragma, "ds-root").getPropertyValue(property);
      if (a !== b) failures.push(`${property}: ${a} != ${b}`);
    }
    expect(failures).toEqual([]);
  });

  it("leaves a plain Vanilla child computing as it would outside any island", async () => {
    const mixed = await render(mixedPage(version, { body: PERMEABLE_BLOCK }));
    const vanilla = await render(vanillaPage(version, PERMEABLE_VANILLA_ONLY));
    const failures: string[] = [];
    for (const id of idsIn(PERMEABLE_VANILLA_ONLY)) {
      failures.push(
        ...differences(
          `#${id}`,
          computed(mixed, id),
          computed(vanilla, id),
          (property) => isLayoutOutput(property),
        ),
      );
    }
    expect(failures).toEqual([]);
  });

  it("still gives a pragma component nested inside a permeable root a full island", async () => {
    const mixed = await render(
      mixedPage(version, { body: PRAGMA_BLOCK + PERMEABLE_BLOCK }),
    );
    // The nested card carries `.ds` in its own right, so it reopens its own
    // scope regardless of the root above it: it should compute exactly like
    // the ordinary nested card in PRAGMA_BLOCK, which is not inside anything
    // permeable.
    expect(
      differences(
        "#perm-nested vs #ds-nested",
        computed(mixed, "perm-nested"),
        computed(mixed, "ds-nested"),
        (property) => isLayoutOutput(property),
      ),
    ).toEqual([]);
    expect(
      differences(
        "#perm-nested-p vs #ds-nested-p",
        computed(mixed, "perm-nested-p"),
        computed(mixed, "ds-nested-p"),
        (property) => isLayoutOutput(property),
      ),
    ).toEqual([]);
  });
});
