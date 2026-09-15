import type { ViewPresentation } from "@canonical/dataviews-core";
import { resolveColumnArrangement } from "@canonical/dataviews-core/bindings";
import type { DataTableColumn } from "../../types.js";
import type { ColumnSetting } from "../types.js";
import areColumnOffersEqual from "./areColumnOffersEqual.js";

/**
 * Every declared column as the arrangement in force places it, with the
 * changes each takes now, read from one resolution of the arrangement: a
 * hidden column can be shown; a shown one moved past the shown column beside
 * it either way; and hidden unless it is declared `hideable: false` or is the
 * last column shown. These are exactly the changes the core's column
 * commands would make, without running a command per column.
 *
 * A column that takes the same changes as it did in `previous` keeps that
 * list's offers object, so a menu holding it renders nothing again for a
 * change elsewhere.
 */
export default function listColumnSettings(
  columns: readonly DataTableColumn[],
  presentation: ViewPresentation,
  previous: readonly ColumnSetting[],
): readonly ColumnSetting[] {
  const arranged = resolveColumnArrangement(columns, presentation);
  const shown = arranged.filter(({ hidden }) => !hidden);
  const places = new Map(shown.map(({ column }, at) => [column.id, at]));
  const kept = new Map(
    previous.map(({ column, offers }) => [column.id, offers]),
  );
  return arranged.map(({ column, hidden }) => {
    const place = places.get(column.id) ?? -1;
    const fresh = {
      hide: !hidden && column.hideable !== false && shown.length > 1,
      show: hidden,
      "move-left": place > 0,
      "move-right": place !== -1 && place < shown.length - 1,
    };
    const last = kept.get(column.id);
    return {
      column,
      hidden,
      offers:
        last !== undefined && areColumnOffersEqual(last, fresh) ? last : fresh,
    };
  });
}
