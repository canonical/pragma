/** A noun for a count: singular for one, plural for any other number. */
export default function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
