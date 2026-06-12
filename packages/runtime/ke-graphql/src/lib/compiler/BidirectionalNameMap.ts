import type { NameMap } from "./types.js";

/**
 * Bidirectional OWL URI ↔ GraphQL name map. Type names map globally; field
 * names are scoped per type ("Component.tier") since the same property can
 * surface on several types. For the reverse direction the first writer wins:
 * a property mapped on several types keeps one canonical OWL target.
 */
export default class BidirectionalNameMap implements NameMap {
  private readonly owlToGraphql = new Map<string, string>();
  private readonly graphqlToOwl = new Map<string, string>();

  /** Record a URI ↔ name pair (reverse direction: first writer wins). */
  set(owlUri: string, graphqlName: string): void {
    this.owlToGraphql.set(owlUri, graphqlName);
    // First writer wins for the reverse direction: a property mapped on
    // several types (inherited fields) keeps one canonical OWL target.
    if (!this.graphqlToOwl.has(graphqlName)) {
      this.graphqlToOwl.set(graphqlName, owlUri);
    }
  }

  /** Look up the GraphQL name for an OWL URI. */
  toGraphQL(uri: string): string | undefined {
    return this.owlToGraphql.get(uri);
  }

  /** Look up the canonical OWL URI for a GraphQL name. */
  toOWL(name: string): string | undefined {
    return this.graphqlToOwl.get(name);
  }

  /** Iterate every (OWL URI, GraphQL name) pair. */
  entries(): Iterable<[string, string]> {
    return this.owlToGraphql.entries();
  }
}
