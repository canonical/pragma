import { ICON_BASE_PATH } from "./constants.js";
import type { IconName } from "./types.js";

/**
 * Load an icon's SVG content
 * @param iconName - Name of the icon to load
 * @param basePath - Base path to the icons directory
 * @returns Promise that resolves to the SVG content
 */
const loadIcon = (
  iconName: IconName,
  basePath = ICON_BASE_PATH,
): Promise<string> => {
  return fetch(`${basePath}${iconName}.svg`).then((res) => res.text());
};

export default loadIcon;
