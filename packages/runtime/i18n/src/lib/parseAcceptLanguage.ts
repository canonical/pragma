/**
 * Parse an `Accept-Language` header into lowercase language tags ordered by
 * descending quality (`q`) weight. Malformed segments are dropped. Pure.
 *
 * @example
 * parseAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.8"); // ["fr-ca", "fr", "en"]
 */
export default function parseAcceptLanguage(
  header: string | null | undefined,
): string[] {
  if (!header) return [];

  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        weight: Number.isNaN(weight) ? 0 : weight,
      };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.tag);
}
