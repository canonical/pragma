import { useHead } from "@canonical/react-head";
import type React from "react";
import { Suspense } from "react";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import { DefinitionsExplorer } from "../DefinitionsExplorer/index.js";
import { readTermParam } from "../definitionsQuery.js";
import type { DefinitionsPageProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds definitions-page";

/**
 * The Definitions lens route content — BOTH routes (`/definitions`, key
 * `definitions`, and `/definitions/:term`, key `definitionsTerm`) mount
 * this page; the only difference is the decoded `term` param. The h1
 * marker stays OUTSIDE the boundaries (the frame suite keys the
 * definitions canvas off `lens-definitions-title`), and route content
 * never suspends at Outlet level — suspension there would swap the whole
 * Shell for the fallback (the PlaygroundPage precedent).
 *
 * No default term (owner ruling): `/definitions` renders the full
 * explorer with an honestly empty inspector, never a redirect.
 */
const DefinitionsPage = ({
  className,
  params,
}: DefinitionsPageProps): React.ReactElement => {
  const term = readTermParam(params ?? {});
  useHead(
    {
      title: term
        ? `${term} — Definitions — Pragma docs`
        : "Definitions — Pragma docs",
    },
    [term],
  );

  return (
    <section
      aria-labelledby="lens-definitions-title"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-view="definitions"
    >
      <h1 id="lens-definitions-title">Definitions</h1>
      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the ontologies…</p>}>
          <DefinitionsExplorer term={term} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
};

export default DefinitionsPage;
