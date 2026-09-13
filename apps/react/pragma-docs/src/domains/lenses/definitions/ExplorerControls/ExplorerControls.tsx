import type React from "react";
import {
  ABSTRACTION_VALUES,
  type Abstraction,
  toggleIn,
} from "../lensFilter.js";
import type { ExplorerControlsProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds explorer-controls";

/** What each abstraction chip says, and what it means. The copy names the
 * axis for what it IS — a fact about the class — never dressing it up as
 * maturity, which this ontology does not record. */
const ABSTRACTION_COPY: {
  readonly [K in Abstraction]: { label: string; hint: string };
} = {
  abstract: {
    label: "Abstract",
    hint: "Classes that are never instantiated directly",
  },
  concrete: {
    label: "Concrete",
    hint: "Classes with instances of their own",
  },
};

/**
 * The explorer's chip toolbar — the mode strip's `controls` socket
 * (`slot.explorer-controls`), claimed by the Definitions routes.
 *
 * The axes are the two the graph ACTUALLY carries per class: abstraction
 * (`isAbstract`) and provenance (the owning ontology's prefix). They are
 * named for what they are. This lens deliberately does NOT show an
 * experimental/stable axis: `OntologyClass` has no lifecycle, status or
 * channel field, and the `Tag` vocabulary that does carry a channel facet
 * applies to UIBlocks rather than to ontology classes — so a maturity
 * filter here would be a label over data that does not exist.
 *
 * Each chip is a real toggle button carrying `aria-pressed`, so its state
 * is available to assistive tech and not merely to the eye. Toggling
 * dims the rail and hides in the graph (the asymmetry) — it never
 * navigates, because a way of looking is not a place to link to.
 */
const ExplorerControls = ({
  className,
  filter,
  namespaceLabels,
  onFilterChange,
}: ExplorerControlsProps): React.ReactElement => {
  const prefixes = namespaceLabels.map(({ prefix }) => prefix);

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="explorer-controls"
    >
      <fieldset aria-label="Filter by abstraction" className="chip-group">
        {ABSTRACTION_VALUES.map((value) => {
          const on = filter.abstractions.includes(value);
          return (
            <button
              aria-pressed={on}
              className="explorer-chip"
              key={value}
              onClick={() => {
                onFilterChange({
                  ...filter,
                  abstractions: toggleIn(
                    filter.abstractions,
                    ABSTRACTION_VALUES,
                    value,
                  ),
                });
              }}
              title={ABSTRACTION_COPY[value].hint}
              type="button"
            >
              <span aria-hidden="true" className="explorer-chip-swatch" />
              {ABSTRACTION_COPY[value].label}
            </button>
          );
        })}
      </fieldset>
      <fieldset aria-label="Filter by ontology" className="chip-group">
        {namespaceLabels.map(({ prefix, label }) => {
          const on = filter.namespaces.includes(prefix);
          return (
            <button
              aria-pressed={on}
              className="explorer-chip"
              key={prefix}
              onClick={() => {
                onFilterChange({
                  ...filter,
                  namespaces: toggleIn(filter.namespaces, prefixes, prefix),
                });
              }}
              title={`Terms from the ${label} ontology`}
              type="button"
            >
              <span aria-hidden="true" className="explorer-chip-swatch" />
              {label}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
};

export default ExplorerControls;
