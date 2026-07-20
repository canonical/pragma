import type { TermRail_ontologies$key } from "#relay/__generated__/TermRail_ontologies.graphql.js";

export interface TermRailProps {
  /** Additional CSS class names. */
  className?: string;
  /** Plural fragment ref over the query root's `ontologies` list. */
  readonly ontologies: TermRail_ontologies$key;
}
