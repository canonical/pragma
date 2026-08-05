import { Link } from "@canonical/router-react";
import type React from "react";
import { jobGist, localName } from "../collectJourneys.js";
import {
  PERSONA_MATCH_NOTE,
  personaMatchesCoordinate,
  personaTerm,
} from "../journeyFilter.js";
import type { JourneyRailProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds journey-rail";

/**
 * The lens's west rail: the DEMAND INDEX — every coordinate the model
 * carries, and under each, every job it roots. This rail is the COMPLETE
 * keyboard path through the lens: it lists every job the well draws, so
 * the graph canvas never has to be traversed to reach anything (WCAG
 * 2.1.3). The well is a spatial view over the same nouns, not the only
 * path to any of them.
 *
 * THE ASYMMETRY, reused verbatim from the Definitions lens: the rail DIMS,
 * it never HIDES. Every coordinate and every job stays mounted in document
 * order under every filter, marked `data-dimmed` when it falls out — so
 * the index stays complete and stable, items never jump under the cursor,
 * and the number of things that EXIST never appears to change. Only the
 * graph narrows (the well is handed a filtered set). Dimmed items take
 * `aria-disabled` so assistive tech hears the state the opacity shows.
 *
 * THE PERSONA AXIS IS LABELLED APPROXIMATE, IN THE INTERFACE. The graph
 * records no persona-to-job edge at all (measured: `Persona` carries no
 * role, actor or fluency axis), so the match is by role NAME and three of
 * the six personas match nothing that way. Rather than hide that behind a
 * confident-looking control, the note rides next to the chips as real
 * text. A filter that quietly lies is worse than no filter.
 *
 * Selection needs no wiring: the router's `Link` stamps
 * `aria-current="page"` on the job whose address is the current URL.
 */
const JourneyRail = ({
  className,
  coordinates,
  filter,
  job,
  onFilterChange,
  personas,
  rolesByCoordinate,
}: JourneyRailProps): React.ReactElement => {
  const rows = coordinates.map((coordinate) => {
    const roles = rolesByCoordinate[coordinate.uri] ?? [];
    // A coordinate is dimmed when either axis excludes it. The coordinate
    // axis is exact; the persona axis is the approximate one.
    const dimmed =
      (filter.coordinate !== undefined &&
        filter.coordinate !== coordinate.uri) ||
      !personaMatchesCoordinate(filter.persona, roles);
    return { coordinate, dimmed };
  });

  const shown = rows.filter((row) => !row.dimmed).length;

  return (
    <nav
      aria-label="Jobs by coordinate"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="journeys-rail"
    >
      <div className="journey-rail-controls">
        <p className="journey-rail-heading">
          Coordinates{" "}
          <span className="journey-rail-count">
            {shown} of {rows.length}
          </span>
        </p>

        <fieldset aria-label="Filter by persona" className="journey-chip-group">
          <button
            aria-pressed={filter.persona === undefined}
            className="journey-chip"
            onClick={() => {
              onFilterChange({ ...filter, persona: undefined });
            }}
            type="button"
          >
            Everyone
          </button>
          {personas.map((persona) => (
            <button
              aria-pressed={filter.persona === persona}
              className="journey-chip"
              key={persona}
              onClick={() => {
                onFilterChange({
                  ...filter,
                  persona: filter.persona === persona ? undefined : persona,
                });
              }}
              type="button"
            >
              {personaTerm(persona)}
            </button>
          ))}
        </fieldset>
        {/* The confession, as real text rather than a tooltip. */}
        <p className="journey-rail-note">{PERSONA_MATCH_NOTE}</p>

        {filter.coordinate === undefined ? null : (
          <button
            className="journey-rail-clear"
            onClick={() => {
              onFilterChange({ ...filter, coordinate: undefined });
            }}
            type="button"
          >
            Show every coordinate
          </button>
        )}
      </div>

      <ul className="journey-rail-list">
        {rows.map(({ coordinate, dimmed }) => (
          <li
            aria-disabled={dimmed ? "true" : undefined}
            data-dimmed={dimmed ? "true" : undefined}
            key={coordinate.uri}
          >
            <button
              aria-pressed={filter.coordinate === coordinate.uri}
              className="journey-rail-coordinate"
              onClick={() => {
                onFilterChange({
                  ...filter,
                  coordinate:
                    filter.coordinate === coordinate.uri
                      ? undefined
                      : coordinate.uri,
                });
              }}
              type="button"
            >
              {coordinate.label ?? coordinate.uri}
            </button>
            <ul className="journey-rail-jobs">
              {coordinate.jobs.map((entry) => {
                // The LEGIBLE label leads — the first clause of the job's own
                // story, not the `job.a1` filing slug. The slug is DEMOTED to
                // quiet monospace secondary text (never deleted: it is still
                // the address a reader may want), and the full story rides as
                // the link's title/tooltip for the truncated case.
                const gist = jobGist(entry);
                const slug = localName(entry.uri);
                const story = entry.story?.trim();
                return (
                  <li key={entry.uri}>
                    <Link
                      className="journey-rail-job"
                      params={{ job: entry.uri }}
                      title={
                        story !== undefined && story.length > 0
                          ? story
                          : undefined
                      }
                      to="journeysJob"
                    >
                      <span className="journey-rail-job-gist">{gist}</span>
                      {/* The identifier, demoted — shown only when it is not
                          already the gist (an unnamed, storyless job). */}
                      {gist === slug ? null : (
                        <span className="journey-rail-job-uri">{slug}</span>
                      )}
                    </Link>
                    {/* The demand nothing serves — worth seeing, so it is
                        stated rather than left to an absent row. */}
                    {entry.pairings.length === 0 ? (
                      <span className="journey-rail-tag">unserved</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {job === undefined ? null : (
        <p className="journey-rail-selected">Selected job is in view.</p>
      )}
    </nav>
  );
};

export default JourneyRail;
