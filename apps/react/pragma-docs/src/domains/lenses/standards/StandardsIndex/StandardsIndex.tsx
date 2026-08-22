import { Link } from "@canonical/router-react";
import type React from "react";
import { graphql, usePaginationFragment } from "react-relay";
import type { StandardsIndex_query$key } from "#relay/__generated__/StandardsIndex_query.graphql.js";
import standardsIndexFragmentNode from "#relay/__generated__/StandardsIndex_query.graphql.js";
import type { StandardsIndexPaginationQuery } from "#relay/__generated__/StandardsIndexPaginationQuery.graphql.js";
import { STANDARDS_PAGE_SIZE } from "../standardsIndexQuery.js";
import type { StandardsIndexProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `StandardsIndex_query` (see `EntityHeader`
 * for the native-import rationale). The `@connection` key + `@refetchable`
 * generate `StandardsIndexPaginationQuery` for `loadNext`. Never invoked.
 *
 * THE LENS REACHES ITS COLLECTION THROUGH THE TBOX. There is no
 * `Query.codeStandards` in the contract and there is no root field on any
 * conforming provider that names a subject — the whole root surface is
 * five structural fields. So the index enumerates
 * `ontologyClass(uri: $classUri).instances`, with the class supplied from
 * outside the graph by `#lib/graphBindings`. Relay is content with a
 * `@refetchable` fragment on `Query` whose `@connection` sits nested
 * inside `ontologyClass`; the generated pagination query carries
 * `$classUri` through with the rest.
 *
 * `ontologyClass` is NULLABLE and the component treats it as such: a
 * binding that names a class this graph does not carry renders the empty
 * state, not a crash.
 */
const standardsIndexFragmentSource = (): unknown => graphql`
  fragment StandardsIndex_query on Query
  @argumentDefinitions(
    classUri: { type: "String!" }
    count: { type: "Int!" }
    cursor: { type: "String" }
  )
  @refetchable(queryName: "StandardsIndexPaginationQuery") {
    ontologyClass(uri: $classUri) {
      uri
      instances(first: $count, after: $cursor)
        @connection(key: "StandardsIndex_instances") {
        edges {
          node {
            uri
            _meta {
              curie
              title
              type {
                uri
                _meta {
                  title
                }
              }
            }
          }
        }
      }
    }
  }
`;
void standardsIndexFragmentSource;

const componentCssClassName = "ds standards-index";

/**
 * Anchor id for a group's section (the jump-link targets), derived from
 * the group's CLASS IRI rather than from its heading. The heading is
 * `_meta.title`, which is human text and not guaranteed unique; the class
 * IRI is the group's actual identity. An anchor id is a DOM handle, not an
 * asserted fact, so splitting a local name off the IRI here is free of the
 * objection that sank deriving categories from a curie's dot structure.
 */
const groupAnchorId = (classUri: string): string => {
  const localName = classUri.split(/[#/]/).at(-1) ?? classUri;
  const slug = (localName === "" ? classUri : localName)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-");
  return `standards-group-${slug}`;
};

/**
 * The index's composed layout: group jump-links west (the mode's
 * secondary nav), grouped reading lists east. Pagination is Relay's
 * connection machinery, surfaced as an explicit "Load more" button rather
 * than an invisible truncation (the catalog's ruling R1 — the live graph
 * carries 131 standards, MORE than one page, so the button is load-bearing
 * here); cursors are opaque server state, never derived client-side.
 *
 * GROUPING IS BY THE INSTANCE'S OWN CLASS (`_meta.type`), the only
 * grouping axis the contract exposes — see the commit that introduced it
 * for why `CodeStandard.categories` could not survive. Against the pragma
 * graph `cs:CodeStandard` has no subclasses today, which collapses this to
 * exactly one group; the jump-link nav therefore renders only when there
 * is more than one, because a one-item secondary nav is noise.
 *
 * Every node has a class and `EntityMeta.type` is non-null, so there is no
 * uncategorised bucket and the group order is a plain title comparison.
 */
const StandardsIndex = ({
  className,
  query,
}: StandardsIndexProps): React.ReactElement => {
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    StandardsIndexPaginationQuery,
    StandardsIndex_query$key
  >(standardsIndexFragmentNode, query);

  const edges = data.ontologyClass?.instances.edges ?? [];
  type IndexNode = (typeof edges)[number]["node"];
  const groups = new Map<string, { title: string; nodes: IndexNode[] }>();
  for (const { node } of edges) {
    const classUri = node._meta.type.uri;
    const bucket = groups.get(classUri) ?? {
      title: node._meta.type._meta.title,
      nodes: [],
    };
    bucket.nodes.push(node);
    groups.set(classUri, bucket);
  }
  const groupUris = [...groups.keys()].sort((a, b) =>
    (groups.get(a)?.title ?? a).localeCompare(groups.get(b)?.title ?? b, "en"),
  );

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {groupUris.length > 1 ? (
        <nav aria-label="Categories" data-region="secondary-nav">
          <ul className="standards-category-links">
            {groupUris.map((classUri) => (
              <li key={classUri}>
                <a href={`#${groupAnchorId(classUri)}`}>
                  {groups.get(classUri)?.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="standards-groups" data-region="canvas">
        {/* Two ways to get here: a zero-edge connection, and a binding that
            names a class this graph does not carry (`ontologyClass` is
            nullable). Both render the honest empty state rather than a
            blank canvas or a crash. */}
        {groupUris.length === 0 ? (
          <p className="standards-empty">No standards in the graph.</p>
        ) : null}
        {groupUris.map((classUri) => (
          <section
            aria-labelledby={`${groupAnchorId(classUri)}-title`}
            id={groupAnchorId(classUri)}
            key={classUri}
          >
            <h3 id={`${groupAnchorId(classUri)}-title`}>
              {groups.get(classUri)?.title}
            </h3>
            <ul className="standards-list">
              {(groups.get(classUri)?.nodes ?? []).map((node) => (
                <li key={node.uri}>
                  {/* Link text is `_meta.title`, which is TOTAL — the
                      provider computes a fallback chain whose tail is the
                      IRI local name, never the full IRI, so there is no
                      `??` arm here and no fabricated title.
                      The ADDRESS is `uri`, the absolute IRI, because
                      `node(id:)` accepts nothing else. */}
                  <Link params={{ uri: node.uri }} to="standardEntity">
                    {node._meta.title}
                  </Link>{" "}
                  <code>{node._meta.curie}</code>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {hasNext ? (
          <p className="standards-more">
            {/* The cap is the server's (R1): the page holds the first 100;
                the button asks for the next hundred. */}
            <button
              disabled={isLoadingNext}
              onClick={() => {
                loadNext(STANDARDS_PAGE_SIZE);
              }}
              type="button"
            >
              {isLoadingNext ? "Loading more…" : "Load more"}
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default StandardsIndex;
