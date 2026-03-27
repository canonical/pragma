/**
 * Validate repository URL.
 */
export default function validateRepository(value: unknown): true | string {
  if (!value || typeof value !== "string") {
    return true; // Optional field
  }

  if (!value.startsWith("https://github.com/")) {
    return "Repository URL must start with https://github.com/";
  }

  return true;
}
