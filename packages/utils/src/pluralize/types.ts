export type PluralizeOptions = {
  /* The singular form of the word (default: 'item'). */
  singularStem?: string;
  /* The plural form of the word (if different from singular stem) */
  pluralStem?: string;
  /* The suffix to use for pluralization (default: 's'). */
  pluralSuffix?: string;
};
