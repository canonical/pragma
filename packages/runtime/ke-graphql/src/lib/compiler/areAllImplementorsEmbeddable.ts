import type { OntologyIR } from "../shared/index.js";

/**
 * Are all concrete implementors of an interface (abstract class) embeddable?
 * Cycle-safe walk over the subclass graph; false when no concrete implementor
 * is reachable at all.
 *
 * This single predicate decides an interface's structural surface, so BOTH
 * consumers must agree on it: Pass 6 injects `_meta` alone (embeddable-only)
 * or `uri` + `_meta` (Node membership) from it, and Pass 4 selects the M005
 * structural-field guard for abstract classes with it. Deriving either side
 * from a different signal (e.g. the abstract class's own `embeddable` flag)
 * lets an ontology field shadow an injected `uri` — or drops a field the
 * interface's implementors all keep.
 */
export default function areAllImplementorsEmbeddable(
  ir: OntologyIR,
  interfaceUri: string,
): boolean {
  const node = ir.classes.get(interfaceUri);
  if (!node) {
    return false;
  }
  const concrete: boolean[] = [];
  const visited = new Set<string>();
  const walk = (uri: string) => {
    if (visited.has(uri)) {
      return; // subClassOf cycles (B001) must not overflow the stack
    }
    visited.add(uri);
    const current = ir.classes.get(uri);
    if (!current) {
      return;
    }
    if (!current.isAbstract) {
      concrete.push(current.embeddable);
    }
    for (const sub of current.subclasses) {
      walk(sub);
    }
  };
  walk(interfaceUri);
  return concrete.length > 0 && concrete.every(Boolean);
}
