import type { ArrangementParams } from "../wire/index.js";
import { HIDDEN_KEY, ORDER_KEY } from "./constants.js";
import listStoredIds from "./listStoredIds.js";
import type { ColumnCommandConfig } from "./types.js";

/**
 * The column arrangement link parameters carry for an arrangement in force:
 * the stored order as it is stored — every id it holds, those of columns
 * another table declares included — or the renderer's declared order where
 * none is stored; and every id the hidden list holds. An order is always
 * given, so the hidden columns it comes with are read whole, none hidden
 * included. Followed where no script keeps the arrangement, the link draws
 * the same columns in every table over the presentation.
 */
export default function resolveArrangementParams({
  columns,
  presentation,
}: Pick<ColumnCommandConfig, "columns" | "presentation">): ArrangementParams {
  return {
    order: Object.hasOwn(presentation, ORDER_KEY)
      ? listStoredIds(presentation[ORDER_KEY])
      : columns.map((column) => column.id),
    hidden: listStoredIds(presentation[HIDDEN_KEY]),
  };
}
