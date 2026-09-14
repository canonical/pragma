/**
 * A fresh view id: 128 random bits in hex. `getRandomValues`, unlike
 * `randomUUID`, is there outside secure contexts too.
 *
 * @note Impure: reads the platform's random source, so two calls never
 * return the same id.
 */
export default function mintViewId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
