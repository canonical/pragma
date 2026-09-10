import type { ExpandableNavItem } from "./types.js";

/**
 * Builds the content's one mandatory item: a collapsible "Help" item
 * containing at least one external link to legal information (SPEC.md §1.1).
 *
 * A thin data-construction helper, not a component — the mandatory item is
 * an ordinary `ExpandableNavItem` (SPEC.md §4.3); this removes the chance
 * of authoring it slightly wrong every time a consumer wires it into their
 * `root`.
 *
 * @param legalUrl The external URL to legal information.
 * @param options.legalLabel Label for the legal link. Defaults to `"Legal information"`.
 * @param options.additionalItems Further leaf items under "Help", after the
 * legal link (e.g. a documentation or support link).
 */
export const createHelpItem = (
  legalUrl: string,
  options: {
    legalLabel?: string;
    additionalItems?: ExpandableNavItem["items"];
  } = {},
): ExpandableNavItem => ({
  key: "help",
  label: "Help",
  icon: "help",
  items: [
    {
      key: "help-legal",
      url: legalUrl,
      label: options.legalLabel ?? "Legal information",
      icon: "external-link",
    },
    ...(options.additionalItems ?? []),
  ],
});
