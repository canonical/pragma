/**
 * A core reason — a lowercase fragment, as schema and store reasons are — as
 * a sentence of its own.
 */
export default function sentenceOf(reason: string): string {
  return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.`;
}
