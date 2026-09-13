import type { ProviderViews } from "@canonical/dataviews-core";
import {
  type ColumnLayout,
  type ColumnSizing,
  sizingEquals,
} from "@canonical/dataviews-core/bindings";
import { useLayoutEffect } from "react";
import { boundsOf } from "../columnKeys.js";

/**
 * The key a column's width is kept under in the collection's saved
 * presentation. Named for the renderer, so another renderer's arrangement
 * never reads a table's widths as its own.
 */
export const widthKey = (id: string): string => `table.width.${id}`;

/**
 * Keep a table's column widths in its collection's saved presentation, when
 * the provider has views.
 *
 * A width the presentation holds becomes the column's fixed width, held to
 * the bounds its declared sizing sets; a column it holds none for keeps its
 * declared sizing. A column width the table's layout record changes to
 * something the saved presentation does not already imply is a resize the
 * user made, saved back as the viewer's arrangement — of the open view, or
 * the default one — so two tables sharing a record never save each other's.
 *
 * The hook observes the views itself: a table restores its widths with no
 * views control on the page. Without views the table keeps its widths for
 * its own lifetime.
 */
export default function usePreferredWidths(
  layout: ColumnLayout,
  views: ProviderViews | null,
): void {
  // Before paint, so widths already read are never painted declared first.
  useLayoutEffect(() => {
    if (views === null) {
      return;
    }
    const declared = Object.entries(layout.state.get().declared);

    /** The width the saved presentation sets a column to, if any. */
    const implied = (id: string, sizing: ColumnSizing): ColumnSizing | null => {
      const width = views.state.get().presentation[widthKey(id)];
      if (typeof width !== "number" || !Number.isFinite(width) || width < 0) {
        return null;
      }
      const { min, max } = boundsOf(sizing);
      return { kind: "fixed", px: Math.min(max, Math.max(min, width)) };
    };

    const apply = (): void => {
      for (const [id, declaredSizing] of declared) {
        const sizing = implied(id, declaredSizing);
        if (sizing === null) {
          layout.resetOverride(id);
        } else {
          layout.setOverride(id, sizing);
        }
      }
    };

    // Only a column whose width changed is looked at: while widths are being
    // applied one by one, the rest still differ from what is implied.
    let seen = layout.state.get().overrides;
    const stopLayout = layout.state.subscribe(() => {
      const { overrides } = layout.state.get();
      const patch: Record<string, number | null> = {};
      for (const [id, declaredSizing] of declared) {
        const override = overrides[id];
        if (override === seen[id]) {
          continue;
        }
        const sizing = implied(id, declaredSizing);
        const agrees =
          override === undefined
            ? sizing === null
            : sizing !== null && sizingEquals(override, sizing);
        if (!agrees) {
          // A reset is kept as null, over a width a view was saved with.
          patch[widthKey(id)] = override?.kind === "fixed" ? override.px : null;
        }
      }
      seen = overrides;
      if (Object.keys(patch).length > 0) {
        views.arrange(patch);
      }
    });
    let preferred = views.state.get().presentation;
    const stopViews = views.state.subscribe(() => {
      const next = views.state.get().presentation;
      if (next !== preferred) {
        preferred = next;
        apply();
      }
    });
    const release = views.observe();
    apply();
    return () => {
      release();
      stopLayout();
      stopViews();
    };
  }, [layout, views]);
}
