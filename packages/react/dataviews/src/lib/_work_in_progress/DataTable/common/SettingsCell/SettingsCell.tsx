import { type ReactElement, useMemo } from "react";
import { SettingsMenuContext } from "../../../../common/index.js";
import { SettingsMenu } from "../SettingsMenu/index.js";
import type { SettingsCellProps } from "./types.js";

const componentCssClassName = "ds data-table-header-cell settings";

/**
 * The header's settings cell, ending the header row: it draws what the table
 * was given as its settings, and hands that the table's settings menu,
 * rendered, one element while the menu's facts and commands hold.
 */
export default function SettingsCell({
  settings,
  menu,
  reserve,
}: SettingsCellProps): ReactElement {
  const rendered = useMemo(() => <SettingsMenu {...menu} />, [menu]);
  return (
    // biome-ignore lint/a11y/useSemanticElements: <th> is only valid inside a <table>, and this grid is deliberately not one
    // biome-ignore lint/a11y/useFocusableInteractive: the header is structure, not a widget — its menu's button carries the focus
    <div role="columnheader" className={componentCssClassName} ref={reserve}>
      <SettingsMenuContext value={rendered}>{settings}</SettingsMenuContext>
    </div>
  );
}
