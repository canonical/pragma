import type { TermInspector_class$key } from "#relay/__generated__/TermInspector_class.graphql.js";
import type { TermInspector_property$key } from "#relay/__generated__/TermInspector_property.graphql.js";
import type { OntologyNamespace } from "../uris.js";

export interface TermInspectorProps {
  /** Additional CSS class names. */
  className?: string;
  /** The selected term (prefixed URI), or undefined on `/definitions`. */
  readonly term: string | undefined;
  /** Fragment ref of the class the term resolved to, when it is one. */
  readonly classRef: TermInspector_class$key | null | undefined;
  /** Fragment ref of the property the term resolved to, when it is one. */
  readonly propertyRef: TermInspector_property$key | null | undefined;
  /** The ontologies' (prefix, namespace) pairs, for prefixing full IRIs. */
  readonly namespaces: readonly OntologyNamespace[];
}
