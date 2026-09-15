import { type ReactElement, useContext } from "react";
import LabelsContext from "../../LabelsContext.js";
import type { ItemLabelProps } from "./types.js";

/**
 * A settings menu item's content: the design system's item label is text,
 * and a column's heading need not be. One component for every item, so a
 * menu listed again remounts no label.
 */
export default function ItemLabel({ item }: ItemLabelProps): ReactElement {
  const labels = useContext(LabelsContext);
  return <span className="label">{labels.get(String(item.key))}</span>;
}
