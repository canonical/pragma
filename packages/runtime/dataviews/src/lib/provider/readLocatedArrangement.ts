import {
  HIDDEN_KEY,
  ORDER_KEY,
  type ViewPresentation,
} from "../presentation/index.js";
import { readArrangementParams } from "../wire/index.js";

/**
 * The column arrangement a location carries where no script keeps it, as
 * the presentation keys it stands for, or null for none: the order only when
 * the location carries one, and the hidden columns whenever it carries
 * either, so a link naming an order shows every column it does not hide.
 */
export default function readLocatedArrangement(
  params: URLSearchParams | undefined,
): ViewPresentation | null {
  const carried = params === undefined ? null : readArrangementParams(params);
  return carried === null
    ? null
    : {
        ...(carried.order === null ? {} : { [ORDER_KEY]: carried.order }),
        [HIDDEN_KEY]: carried.hidden,
      };
}
