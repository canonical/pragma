/** One hidden control of a GET form: a parameter carried as it was spelled. */
type HiddenField = {
  /** Distinct among the fields, so a repeated parameter keys its own control. */
  readonly key: string;
  readonly name: string;
  readonly value: string;
};

/**
 * The hidden controls a GET form carries beside its own: every parameter of
 * the spelled query, duplicates included and in order, less the names the
 * form's visible controls submit themselves. Nothing without a spelling —
 * a provider given no location has no destination for a form to reach.
 */
export default function listHiddenFields(
  params: URLSearchParams | null,
  omit: readonly string[],
): readonly HiddenField[] {
  if (params === null) {
    return [];
  }
  const seen = new Map<string, number>();
  return [...params]
    .filter(([name]) => !omit.includes(name))
    .map(([name, value]) => {
      const pair = `${name}=${value}`;
      const repeat = seen.get(pair) ?? 0;
      seen.set(pair, repeat + 1);
      return { key: repeat === 0 ? pair : `${pair}#${repeat}`, name, value };
    });
}
