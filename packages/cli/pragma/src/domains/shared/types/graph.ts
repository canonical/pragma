/** Graph inspection return types. */

/** A predicate group from `graph inspect`: one predicate with all its objects. */
export interface PredicateGroup {
  /** RDF predicate URI (e.g., `"rdfs:label"`). */
  readonly predicate: string;
  /** Object values (URIs or literals) associated with this predicate. */
  readonly objects: readonly string[];
}

/** Result of `graph inspect <uri>`: all triples where URI is subject. */
export interface InspectResult {
  /** The inspected subject URI. */
  readonly uri: string;
  /** Predicate groups aggregating all outgoing triples. */
  readonly groups: readonly PredicateGroup[];
}
