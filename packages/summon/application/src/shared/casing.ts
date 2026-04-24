/**
 * Normalize a command path argument: trim, remove leading/trailing slashes,
 * convert backslashes to forward slashes.
 *
 * This is generator-specific — it normalizes CLI input like
 * `" /billing/invoices/ "` → `"billing/invoices"`.
 */
export function normalizeCommandPath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}
