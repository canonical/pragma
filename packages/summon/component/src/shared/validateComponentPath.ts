import * as path from "node:path";
import { isPascalCase } from "./string-helpers/index.js";

/**
 * Validate component path.
 *
 * Rejects an empty path, an absolute path, or one that escapes the project via
 * `..` segments (all of which would write outside the working tree), and
 * requires the final path segment to be a PascalCase component name.
 */
export default function validateComponentPath(value: unknown): true | string {
  if (!value || typeof value !== "string") {
    return "Component path is required";
  }
  if (path.isAbsolute(value)) {
    return "Component path must be relative to the project, not absolute";
  }
  const segments = value.split(/[/\\]/);
  if (segments.includes("..")) {
    return "Component path must stay within the project (no '..' segments)";
  }
  const name = path.basename(value);
  if (!isPascalCase(name)) {
    return "Component name must be in PascalCase (e.g., MyComponent)";
  }
  return true;
}
