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
 * "left alone" claim has a page to compare against. A plain trailing sibling
 * stands in for `perm-nested`: not itself compared, but present so a
 * `:last-child`-dependent Vanilla rule (the button's own spacing) sees the
 * same sibling shape the real block gives it. */
const PERMEABLE_VANILLA_ONLY = `
<div id="perm-root">
  <h2 id="perm-h2">Heading</h2>
  <p id="perm-p">Paragraph</p>
  <button id="perm-button" class="p-button">Button</button>
  <div></div>
</div>`;

/**
 * A permeable root nested inside an ordinary `.ds` ancestor: the case a
 * `:scope`-anchored limit misses, because the ancestor's own scope instance
 * never carries `ds-permeable` and so never finds its limit.
 */
const NESTED_PERMEABLE_BLOCK = `
<div class="ds card" id="nested-perm-outer">
  <div class="ds grid ds-permeable" id="nested-perm-root">
    <p id="nested-perm-p">Paragraph</p>
  </div>
</div>`;

const NESTED_PERMEABLE_VANILLA_ONLY = `
<div id="nested-perm-root">
  <p id="nested-perm-p">Paragraph</p>
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

/**
 * Properties that legitimately differ on a permeable root's plain Vanilla
 * child, per DESIGN.md's "what this does not do": the root still declares
 * pragma's own font and colour for itself, and those are ordinary inherited
 * CSS properties that reach the child the same way any parent's declaration
 * reaches anything inside it — `@scope` narrows which rules match an element,
 * not what an element inherits from its ancestors. `color-scheme` is itself
 * an inherited property, and the `currentColor`-derived properties below
 * simply track the same inherited `color` that `ROOT_INHERITED` already
 * names, so they are not independent leaks.
 */
const CURRENT_COLOR_DERIVED = new Set([
  "border-block-end-color",
  "border-block-start-color",
  "border-bottom-color",
  "border-inline-end-color",
  "border-inline-start-color",
  "border-left-color",
  "border-right-color",
  "border-top-color",
  "caret-color",
  "column-rule-color",
  "outline-color",
  "row-rule-color",
  "text-decoration-color",
  "text-emphasis-color",
  "-webkit-text-fill-color",
  "-webkit-text-stroke-color",
]);

const isPermeableInheritance = (property: string): boolean =>
  ROOT_INHERITED.includes(property) ||
  CURRENT_COLOR_DERIVED.has(property) ||
  property === "color-scheme";

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
    // perm-root itself keeps the confined baseline (asserted above), so only
    // its plain Vanilla children are compared against the Vanilla-only page.
    for (const id of idsIn(PERMEABLE_VANILLA_ONLY).filter(
      (id) => id !== "perm-root",
    )) {
      failures.push(
        ...differences(
          `#${id}`,
          computed(mixed, id),
          computed(vanilla, id),
          (property) => isLayoutOutput(property) || isPermeableInheritance(property),
        ),
      );
    }
    expect(failures).toEqual([]);
  });

  it("leaves a plain Vanilla child alone even when the permeable root is nested inside an ordinary .ds ancestor", async () => {
    const mixed = await render(
      mixedPage(version, { body: NESTED_PERMEABLE_BLOCK }),
    );
    const vanilla = await render(
      vanillaPage(version, NESTED_PERMEABLE_VANILLA_ONLY),
    );
    // nested-perm-root itself keeps the confined baseline, so only its plain
    // Vanilla child is compared against the Vanilla-only page.
    const failures = idsIn(NESTED_PERMEABLE_VANILLA_ONLY)
      .filter((id) => id !== "nested-perm-root")
      .flatMap((id) =>
        differences(
          `#${id}`,
          computed(mixed, id),
          computed(vanilla, id),
          (property) => isLayoutOutput(property) || isPermeableInheritance(property),
        ),
      );
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
