import { useHead } from "@canonical/react-head";
import type React from "react";
import { Suspense } from "react";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import { JourneysExplorer } from "../JourneysExplorer/index.js";
import { readJobParam } from "../journeysQuery.js";
import type { JourneysPageProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds journeys-page";

/**
 * The Journeys lens route content — BOTH routes (`/journeys`, key
 * `journeys`, and `/journeys/:job`, key `journeysJob`) mount this page;
 * the only difference is the decoded `job` param. The h1 marker stays
 * OUTSIDE the boundaries (the frame suite keys the journeys canvas off
 * `lens-journeys-title`), and route content never suspends at Outlet
 * level — suspension there would swap the whole Shell for the fallback
 * (the PlaygroundPage precedent).
 *
 * No default job: `/journeys` renders the full diagram with an honestly
 * empty inspector, never a redirect — the Definitions lens's ruling,
 * applied to the same shape of problem.
 */
const JourneysPage = ({
  className,
  params,
}: JourneysPageProps): React.ReactElement => {
  const job = readJobParam(params ?? {});
  useHead(
    {
      title: job ? `${job} — Journeys — Pragma docs` : "Journeys — Pragma docs",
    },
    [job],
  );

  return (
    <section
      aria-labelledby="lens-journeys-title"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-view="journeys"
    >
      <h1 id="lens-journeys-title">Journeys</h1>
      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the demand model…</p>}>
          <JourneysExplorer job={job} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
};

export default JourneysPage;
