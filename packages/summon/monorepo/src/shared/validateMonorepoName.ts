/**
 * Validate monorepo name (simple kebab-case identifier).
 */
export default function validateMonorepoName(value: unknown): true | string {
  if (!value || typeof value !== "string") {
    return "Monorepo name is required";
  }

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(value)) {
    return "Name must be lowercase kebab-case (e.g., my-monorepo)";
  }

  return true;
}
