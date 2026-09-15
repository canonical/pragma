import { type ReactElement, useContext } from "react";
import { SettingsMenuContext } from "../../../../common/index.js";

/**
 * Almost all configurable aspects of the table are available through the
 * table settings menu. This menu provides a centralized interface accessed
 * through a settings wheel (gear) icon button in the table header for
 * column reordering, column pinning, column visibility, and resetting user
 * customizations.
 *
 * That is the design system's description of the block. What this part
 * covers: each column's visibility and its place, and the reset; no pinning.
 * Given to a table as its `settings`, which the table puts in its header's
 * settings cell, it offers every column the table declares, hidden ones
 * included, with a toggle named for it, Move left and Move right, and Reset
 * table settings. What it changes is the provider's presentation, which
 * every table on the provider reads: a column hidden or moved asks the
 * source for nothing and changes no query, and a saved view remembers its
 * columns. It takes no props: the table it is placed in supplies the menu,
 * and it throws anywhere else. It works the same inside a standalone
 * `DataTable` and a `DataViews.DataTable`.
 *
 * Without scripting it is a disclosure of real links, each to the page the
 * change leads to, where the provider has a location; once scripts run,
 * the design system's contextual menu.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @implements ds:apps.subcomponent.data_table-settings_menu
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function Settings(): ReactElement {
  const menu = useContext(SettingsMenuContext);
  if (menu === null) {
    throw new Error(
      "DataViews.Settings must be used as a DataTable's settings",
    );
  }
  return menu;
}
