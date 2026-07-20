import { useHead } from "@canonical/react-head";
import { Link } from "@canonical/router-react";
import type React from "react";
import { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import type { LobbyQuery } from "#relay/__generated__/LobbyQuery.graphql.js";
import lobbyQueryNode from "#relay/__generated__/LobbyQuery.graphql.js";
import {
  LOBBY_COMPONENT_CLASS,
  LOBBY_EXEMPLAR_COUNT,
  LOBBY_PATTERN_CLASS,
  LOBBY_STANDARD_CLASS,
} from "./lobbyQuery.js";
import "./homeStyles.css";

/**
 * Codegen source of truth for `LobbyQuery` — the whole lobby is one
 * operation (see `EntityHeader` for the native-import rationale: the
 * server bricks natively import the routes graph, so an evaluated
 * module-scope tag would throw). Never invoked.
 *
 * Three `ontologyClass` reads and one instance projection.
 * `instanceCount` rather than an edge count is the honest-number ruling —
 * see the header of `lobbyQuery.ts` for why a connection count LIES here.
 */
const lobbyQuerySource = (): unknown => graphql`
  query LobbyQuery(
    $componentClass: String!
    $patternClass: String!
    $standardClass: String!
    $exemplars: Int!
  ) {
    componentClass: ontologyClass(uri: $componentClass) {
      instanceCount
      instances(first: $exemplars) {
        edges {
          node {
            __typename
            ... on Component {
              uri
              name
            }
          }
        }
      }
    }
    patternClass: ontologyClass(uri: $patternClass) {
      instanceCount
    }
    standardClass: ontologyClass(uri: $standardClass) {
      instanceCount
    }
  }
`;
void lobbyQuerySource;

const componentCssClassName = "ds lobby";

/**
 * The data-bearing interior: ONE `useLazyLoadQuery` for the page. Both
 * projections — the exemplar strip and the doors' counts — read from it,
 * so the lobby never fires a second operation.
 */
const LobbyBands = (): React.ReactElement => {
  const data = useLazyLoadQuery<LobbyQuery>(lobbyQueryNode, {
    componentClass: LOBBY_COMPONENT_CLASS,
    patternClass: LOBBY_PATTERN_CLASS,
    standardClass: LOBBY_STANDARD_CLASS,
    exemplars: LOBBY_EXEMPLAR_COUNT,
  });

  // The lookups are nullable by schema (an unknown class URI resolves to
  // null). A missing class means a store without that vocabulary loaded —
  // a legitimate empty, so the sentence carrying the number is dropped
  // rather than a zero being printed.
  const componentCount = data.componentClass?.instanceCount;
  const patternCount = data.patternClass?.instanceCount;
  const standardCount = data.standardClass?.instanceCount;

  // Only `Component` instances carry uri/name in this selection; the
  // inline fragment leaves other typenames without them, so the strip
  // keeps the ones it can honestly address rather than linking nowhere.
  const exemplars = (data.componentClass?.instances.edges ?? []).flatMap(
    ({ node }) =>
      node.__typename === "Component" && node.uri !== undefined
        ? [{ uri: node.uri, name: node.name ?? node.uri }]
        : [],
  );

  return (
    <>
      {/* ── examples strip (layout.lobby slot `examples`, 0..1) ──
          The first projection. A handful of real components straight off
          ds:Component, in the graph's own order — the point is to SHOW
          the graph, not summarise it, and every name is a live link into
          the components lens. Absent when the graph yields none (the
          standards lens's precedent for optional slots). */}
      {exemplars.length > 0 ? (
        <section
          aria-labelledby="lobby-examples-title"
          className="lobby-examples"
          data-slot="examples"
        >
          <h2 id="lobby-examples-title">A few of the components</h2>
          <p>
            Read live, in the graph&rsquo;s own order. The names span tiers —
            global entries sit beside application ones, because the graph does
            not privilege either.
          </p>
          <ul className="lobby-exemplars">
            {exemplars.map((exemplar) => (
              <li key={exemplar.uri}>
                <Link params={{ uri: exemplar.uri }} to="componentEntity">
                  {exemplar.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── doors (layout.lobby slot `doors`, cardinality 1) ──
          The second projection rides here: each lens's honest size, where
          the schema serves one cheaply. Definitions carries NO number —
          see lobbyQuery.ts; naming the lens without a count is the honest
          form, not a gap waiting to be filled. */}
      <section
        aria-labelledby="lobby-doors-title"
        className="lobby-doors"
        data-slot="doors"
      >
        <h2 id="lobby-doors-title">The lenses</h2>
        <ul className="lobby-door-list">
          <li>
            <Link to="components">Components</Link>
            <p>
              Every block the design system describes — anatomy, properties, and
              the relations tying one to another.
              {componentCount === undefined ||
              patternCount === undefined ? null : (
                <>
                  {" "}
                  The graph holds {componentCount} components and {patternCount}{" "}
                  patterns.
                </>
              )}
            </p>
          </li>
          <li>
            <Link to="definitions">Definitions</Link>
            <p>
              The vocabulary itself: the classes and properties the other lenses
              are written in, with the hierarchy drawn out.
            </p>
          </li>
          <li>
            <Link to="standards">Standards</Link>
            <p>
              The rules the code is held to, grouped by category and readable
              end to end.
              {standardCount === undefined ? null : (
                <> The graph holds {standardCount} of them.</>
              )}
            </p>
          </li>
          <li>
            <Link to="guides">Guides</Link>
            <p>
              Long-form orientation. A placeholder for now — the reading views
              are not built yet.
            </p>
          </li>
        </ul>
      </section>
    </>
  );
};

/**
 * The Home lobby (`/`, route key `home` — the first entry in the Rail's
 * lens set, which labels it "Home"). `layout.lobby` calls this shape
 * "orientation + pitch: editorial bands … nearly slotless by design: one
 * canvas, no chrome", and that is what it is: authored prose carrying two
 * small live projections, not a dashboard of counts.
 *
 * Slot mapping against `layout.lobby`: `hero` (cardinality 1) is the
 * opening band; `examples` (0..1) is the exemplar strip; `doors`
 * (cardinality 1) is the lens list. The strip is the optional one and
 * renders only when the graph actually yields exemplars.
 *
 * The h1 stays OUTSIDE the boundaries (the frame suite keys the home
 * canvas off `lobby-title`), and route content never suspends at Outlet
 * level — suspension there would swap the whole Shell for the fallback
 * (the PlaygroundPage precedent).
 */
const HomePage = (): React.ReactElement => {
  useHead({ title: "Pragma docs" });

  return (
    <section aria-labelledby="lobby-title" className={componentCssClassName}>
      {/* ── hero (layout.lobby slot `hero`, cardinality 1) ──
          Pure authored prose: what the site is and what backs it. It
          promises nothing the site does not do. */}
      <div className="lobby-hero" data-slot="hero">
        <h1 id="lobby-title">The design system, as a graph</h1>
        <p className="lobby-lead">
          This site reads a knowledge graph of the design system and renders it.
          Components, the vocabulary describing them, and the standards the code
          is held to are one body of data seen through different lenses — so a
          component&rsquo;s anatomy, the class defining it, and the rule
          governing it are a link apart rather than three documents to
          reconcile.
        </p>
        <p>
          Nothing here is written twice. Every name and number below is read
          from the graph as the page is served; the prose around them is the
          only authored part.
        </p>
      </div>

      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the graph&rsquo;s shape…</p>}>
          <LobbyBands />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
};

export default HomePage;
