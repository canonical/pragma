import { tableWidthCSSVar } from "../constants.js";

export const updateTableWidth = (table: HTMLTableElement) => {
  table.style.cssText = `${tableWidthCSSVar}: ${table.clientWidth}px`;
};

export default updateTableWidth;
