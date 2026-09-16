/**
 * A reason as a clause another sentence ends: the space and whatever full
 * stops the reason came with are dropped, so a message that ends the
 * sentence itself never writes two. A stop inside the reason stands.
 */
export default function composeClause(reason: string): string {
  return reason.trim().replace(/\.+$/, "");
}
