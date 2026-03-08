/**
 * String manipulation utilities for component generators
 */

import * as path from "node:path";

/**
 * Convert PascalCase to kebab-case
 */
export const kebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
};

/**
 * Extract component name from path
 */
export const getComponentName = (componentPath: string): string => {
  return path.basename(componentPath);
};

/**
 * Get parent directory of component
 */
export const getParentDir = (componentPath: string): string => {
  return path.dirname(componentPath);
};
