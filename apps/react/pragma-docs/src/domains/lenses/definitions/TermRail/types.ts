import type { TermRail_ontologies$key } from "#relay/__generated__/TermRail_ontologies.graphql.js";
import type { LensFilter } from "../lensFilter.js";

export interface TermRailProps {
  /** Additional CSS class names. */
  className?: string;
  /**
   * The lens's ephemeral filter, owned by `DefinitionsExplorer` so the
   * rail, the well and the strip's controls all read one value. The rail
   * only ever DIMS on it — it never removes an item (see the component).
   */
  readonly filter: LensFilter;
  /** Plural fragment ref over the query root's `ontologies` list. */
  readonly ontologies: TermRail_ontologies$key;
  /**
   * Superclass depth per class, keyed by FULL IRI — the same measure the
   * well stacks its layers by (`classDepthsByUri`), computed once by
   * `DefinitionsExplorer` and passed down. The rail's own fragment cannot
   * carry `superclass` without changing the shared operation's query text
   * (the relay-byte-identity contract), so depth arrives as data rather
   * than as a fragment field. A URI absent from the map reads as depth 0.
   */
  readonly depthByUri: ReadonlyMap<string, number>;
}
