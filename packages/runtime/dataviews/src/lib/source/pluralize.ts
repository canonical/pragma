/**
 * A noun with the count that names it: "1 term", "2 terms". Internal to the
 * package — a message helper, not part of the contract.
 */
export default function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
