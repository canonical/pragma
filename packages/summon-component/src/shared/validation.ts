/**
 * Validation utilities for component generators
 */

import * as path from "node:path";

/**
 * Check if a string is in PascalCase
 */
export const isPascalCase = (str: string): boolean => {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str);
};

/**
 * Validate component path
 */
export const validateComponentPath = (value: unknown): true | string => {
  if (!value || typeof value !== "string") {
    return "Component path is required";
  }
  const name = path.basename(value);
  if (!isPascalCase(name)) {
    return "Component name must be in PascalCase (e.g., MyComponent)";
  }
  return true;
};
