/**
 * Which cascade layer a package's component stylesheets sit in.
 *
 * `@canonical/styles` orders the component tiers in one statement, and the
 * order follows the design system's own tier tree, flat: `ds.components.global`
 * below `ds.components.sites`, `documentation`, `stores` and `apps`, and a
 * sub-tier package — one product's own components — in a layer of its own named
 * after it, `ds.components.apps-lxd`. Flat rather than nested because a nested
 * layer sorts inside its parent, so `ds.components.apps.lxd` would sit below
 * every rule written directly in `ds.components.apps`, which is the opposite of
 * what a product tier needs.
 *
 * The mapping is by package name because that is the one identifier a generator
 * always has, and because it is the name the tier tree is keyed on. Getting it
 * from the package rather than from the author is the point: a wrong layer is
 * silent, and reintroduces the source-order race the layers exist to end.
 *
 * Owner ruling 2026-09-06 (VC.31). `ds.components.app` is retired.
 */

/** The root of the component tiers; the layer a tierless package falls back to. */
export const GLOBAL_COMPONENT_LAYER = "ds.components.global";

/**
 * The second level of the tier tree, as pragma's order statement names it, and
 * the package-name stems that map to each. `global` has no sub-tiers: a
 * `ds-global-*` package is another slice of the global tier, not a product.
 */
const TIERS = [
  { tier: "global", stems: ["ds-global"], subTiers: false },
  { tier: "sites", stems: ["ds-sites", "ds-site"], subTiers: true },
  {
    tier: "documentation",
    stems: ["ds-documentation", "ds-docs"],
    subTiers: true,
  },
  { tier: "stores", stems: ["ds-stores", "ds-store"], subTiers: true },
  { tier: "apps", stems: ["ds-apps", "ds-app"], subTiers: true },
] as const;

/**
 * Product suffixes a package name abbreviates, and the tier id behind each.
 *
 * A layer is named for the tier in the design system's tree, and a package is
 * named for the team that says it out loud, which is not always the same word:
 * `@canonical/svelte-ds-app-wpe` implements the Workplace Engineering tier.
 * Without this, the suffix would become the layer, the package's own sheets
 * would say one name and a generated component another, and the two would sort
 * as different layers.
 */
const SUFFIX_ALIASES: Record<string, string> = {
  wpe: "workplaceengineering",
};

/** Every second-level layer name, in the order pragma's statement names them. */
export const COMPONENT_TIER_LAYERS = TIERS.map(
  ({ tier }) => `ds.components.${tier}`,
);

/**
 * The layer for a package's component stylesheets, from its name.
 *
 * The stem may be the whole name after the scope and framework prefix
 * (`@canonical/react-ds-app` → `ds.components.apps`) or carry a product suffix
 * (`@canonical/react-ds-app-lxd` → `ds.components.apps-lxd`). A name that
 * matches no tier is global, which is both the safe default and what the
 * untiered packages are.
 *
 * Pure.
 */
export function componentLayerFor(packageName: string | undefined): string {
  if (!packageName) return GLOBAL_COMPONENT_LAYER;
  // The stem starts at the first `ds-`; anything before it is the scope and the
  // framework (`@canonical/react-`, `@canonical/svelte-`).
  const match = /(?:^|[@/-])(ds-[a-z0-9-]*)$/.exec(packageName);
  if (!match) return GLOBAL_COMPONENT_LAYER;
  const stem = match[1];
  for (const { tier, stems, subTiers } of TIERS) {
    for (const s of stems) {
      if (stem === s) return `ds.components.${tier}`;
      if (subTiers && stem.startsWith(`${s}-`)) {
        const suffix = stem.slice(s.length + 1);
        return `ds.components.${tier}-${SUFFIX_ALIASES[suffix] ?? suffix}`;
      }
      // A tier without sub-tiers absorbs its suffixed packages: ds-global-form
      // is more of the global tier, not a product of its own.
      if (!subTiers && stem.startsWith(`${s}-`)) return `ds.components.${tier}`;
    }
  }
  return GLOBAL_COMPONENT_LAYER;
}

/**
 * True when the layer is a sub-tier — one product's own — rather than one of
 * the five the styles package's order statement already names. A sub-tier
 * package declares its own layer, first in its CSS entry, because no statement
 * upstream of it can know the name.
 */
export function isSubTierLayer(layer: string): boolean {
  return !COMPONENT_TIER_LAYERS.includes(layer);
}
