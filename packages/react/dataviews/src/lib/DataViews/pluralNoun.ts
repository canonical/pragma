/**
 * A noun for a count: singular for one, plural for any other number. The
 * noun alone — the caller places the number, which is often not beside it.
 * Named apart from the core's `plural`, which returns the count with it.
 */
export default function pluralNoun(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
