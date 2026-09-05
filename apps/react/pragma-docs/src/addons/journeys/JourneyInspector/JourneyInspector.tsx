import type React from "react";
import { localName } from "../collectJourneys.js";
import type { JourneyInspectorProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds journey-inspector";

/** A vocabulary URI's display term — `surface:Primary` → `Primary`. */
const term = (uri: string | null | undefined): string | undefined =>
  uri == null ? undefined : localName(uri);

/**
 * The lens's east panel: everything the model says about the SELECTED JOB,
 * and nothing it does not.
 *
 * THE STORY IS VERBATIM. A job's `story` is the demand written in the
 * reader's own words ("When I land on a component cold…"), and it is
 * rendered exactly as the graph holds it — never summarised, never
 * re-worded. Same for each acceptance criterion. The whole value of a
 * demand model is that it records what someone actually said, so
 * paraphrasing it here would destroy the thing being documented.
 *
 * THE COORDINATE IS SPELLED OUT IN WORDS (`describeCoordinate`), including
 * its wildcards: an unconstrained axis reads "any role", because the
 * ontology says an absent axis MATCHES ANYTHING rather than being a gap.
 * That is reporting the data, not padding it.
 *
 * EACH PAIRING carries its role and its arrival, both as the graph's own
 * terms. An ABSENT arrival is rendered as absent — 34 of 133 pairings
 * carry none, and pairings to ports carry none by rule — so the panel says
 * nothing rather than inventing a default.
 *
 * SURFACES LINK OUT only where the docsite genuinely renders that surface
 * (`ROUTE_BY_SURFACE`). 50 of the 59 paired surfaces have no page here, and
 * those render as plain text: a dead link would be a worse lie than an
 * honest absence.
 */
const JourneyInspector = ({
  className,
  job,
}: JourneyInspectorProps): React.ReactElement => (
  <aside
    aria-label="Job inspector"
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    data-slot="journeys-inspector"
  >
    {job === undefined ? (
      <p className="journey-inspector-empty">
        Select a job to read its story, its acceptance criteria, and the
        surfaces that serve it.
      </p>
    ) : (
      <article className="journey-inspector-body">
        <h2 id="journey-inspector-title">{job.label}</h2>
        <p className="journey-inspector-coordinate">{job.coordinate}</p>

        {job.story === undefined ? null : (
          <blockquote className="journey-inspector-story">
            {job.story}
          </blockquote>
        )}

        {job.acceptances.length === 0 ? null : (
          <section>
            <h3>Acceptance</h3>
            <ul className="journey-inspector-acceptances">
              {job.acceptances.map((acceptance) => (
                <li key={acceptance}>{acceptance}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3>Served by</h3>
          {job.pairings.length === 0 ? (
            // Demand nothing serves. Stated plainly: this is the single
            // most actionable fact the lens can surface.
            <p className="journey-inspector-unserved">
              No surface is paired to this job.
            </p>
          ) : (
            <ul className="journey-inspector-pairings">
              {job.pairings.map((pairing) => {
                const surface = pairing.surface;
                const role = term(pairing.role);
                const arrival = term(pairing.arrival);
                return (
                  <li key={pairing.uri}>
                    <p className="journey-inspector-surface">
                      {surface == null ? (
                        <span>{pairing.label ?? pairing.uri}</span>
                      ) : surface.href == null ? (
                        <span>{surface.label ?? surface.uri}</span>
                      ) : (
                        <a href={surface.href}>
                          {surface.label ?? surface.uri}
                        </a>
                      )}
                      {surface?.surfaceType === undefined ? null : (
                        <span className="journey-inspector-kind">
                          {surface.surfaceType}
                        </span>
                      )}
                    </p>
                    <p className="journey-inspector-facets">
                      {role === undefined ? null : (
                        <span data-facet="role">{role}</span>
                      )}
                      {/* Absent arrival renders as absent — it is data. */}
                      {arrival === undefined ? null : (
                        <span data-facet="arrival">{arrival}</span>
                      )}
                      {surface?.layout == null ? (
                        <span data-facet="layout-absent">
                          composes no layout
                        </span>
                      ) : (
                        <span data-facet="layout">
                          {surface.layout.label ?? surface.layout.uri}
                        </span>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </article>
    )}
  </aside>
);

export default JourneyInspector;
