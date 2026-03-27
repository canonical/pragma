import * as path from "node:path";
import { isPascalCase } from "./string-helpers/index.js";

/**
 * Validate component path
 */
export default function validateComponentPath(value: unknown): true | string {
  if (!value || typeof value !== "string") {
    return "Component path is required";
  }
  const name = path.basename(value);
  if (!isPascalCase(name)) {
    return "Component name must be in PascalCase (e.g., MyComponent)";
  }
  return true;
}
