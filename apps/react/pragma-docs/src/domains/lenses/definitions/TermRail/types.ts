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
}
