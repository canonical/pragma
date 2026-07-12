/**
 * Normalize a `names` parameter into a clean string array.
 *
 * Accepts the multiselect array form and the legacy single `name` string,
 * dropping empty and non-string entries. Shared by every lookup story —
 * replaces the per-domain copies that previously lived in each
 * `commands/lookup.ts`.
 */
export default function normalizeNames(
  names: unknown,
  legacyName?: unknown,
): string[] {
  if (Array.isArray(names)) {
    return names.filter(
      (name): name is string => typeof name === "string" && name.length > 0,
    );
  }
  if (typeof legacyName === "string" && legacyName.length > 0) {
    return [legacyName];
  }
  return [];
}
