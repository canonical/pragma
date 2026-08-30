/**
 * A model/view pair for one input: `format` projects the stored value into what
 * the user sees, `parse` recovers the stored value from whatever the user typed.
 *
 * The split exists because for some fields the string on screen is deliberately
 * not the string that is submitted — a phone number shown as `(555) 123-4567` is
 * stored as `5551234567`. The formatter names that split, so the display rule and
 * the normalisation rule travel together instead of drifting apart.
 *
 * Two properties are required of an implementation, because `useFormattedValue`
 * relies on them to place the caret after a reformat:
 *
 * - **`format` accepts partial models.** It is called on every keystroke, so it
 *   must render half-typed values (`"555"`) without waiting for a complete one.
 * - **`parse` is total and left-inverse to `format`** — `parse(format(m)) === m`
 *   for any model `m` the field can hold, and `parse` never throws, whatever the
 *   user pastes in.
 *
 * A fixed pattern is only the simplest case; `createPatternFormatter` builds one
 * from a grouping string. Because `format` is an ordinary function it can just as
 * well choose its grouping from the value itself — which is what a card number
 * needs, since American Express groups 4-6-5 where most brands group 4-4-4-4.
 */
export type Formatter = {
  /** Project the stored model value into the string the user sees. */
  format: (model: string) => string;

  /** Recover the stored model value from the string the user typed. */
  parse: (view: string) => string;
};
