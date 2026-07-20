import { Link } from "@canonical/router-react";
import type React from "react";
import { graphql, useFragment } from "react-relay";
import type { StandardArticle_standard$key } from "#relay/__generated__/StandardArticle_standard.graphql.js";
import standardArticleFragmentNode from "#relay/__generated__/StandardArticle_standard.graphql.js";
import type { StandardArticleProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `StandardArticle_standard` (see
 * `EntityHeader` for the native-import rationale: this module rides the
 * server bricks' native import chain through the reading route). Never
 * invoked. The literal connection args are deliberate bounds, verified
 * live: every standard carries exactly one category and at most one
 * `extends` target (7/131 carry any) — 8 is headroom, not a page.
 *
 * DELIBERATELY NOT SELECTED: `dos` and `donts`. Both are real schema
 * fields (`ExampleConnection!`) on `CodeStandard`, but the live graph
 * carried ZERO example rows for either across all 131 standards at
 * capture — so querying them would cost a round trip to render nothing,
 * and the article has no examples section to render them into. This is
 * the selection site: when examples land upstream, add them here (and a
 * section below) rather than assuming the omission was an oversight.
 */
const standardArticleFragmentSource = (): unknown => graphql`
  fragment StandardArticle_standard on CodeStandard {
    uri
    name
    description
    categories(first: 8) {
      edges {
        node {
          id
          slug
        }
      }
    }
    extends(first: 8) {
      edges {
        node {
          id
          uri
          name
        }
      }
    }
  }
`;
void standardArticleFragmentSource;

const componentCssClassName = "ds standard-article";

/**
 * Split the description's plain text into paragraph blocks on blank
 * lines. Single newlines survive INSIDE a block (rendered by the
 * stylesheet's `pre-line`), so hand-written bullet lines keep their line
 * breaks without any markdown machinery.
 */
const splitProseBlocks = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

/**
 * The reading column — `layout.reading`'s required `reading-canvas` slot:
 * identity header (title, prefixed URI, category slugs), the standard's
 * prose, and its `extends` cross-links.
 *
 * Prose is the graph's `description` rendered as PLAIN TEXT paragraph
 * blocks — deliberately no markdown pipeline (the R8 precedent defers
 * one), so inline backticks and `*emphasis*` marks in the source text
 * show verbatim. Honest over pretty until a sanctioned renderer lands.
 * The title falls back `name ?? uri`: only 4 of 131 live standards carry
 * a display name, and the URI is the entity's canonical identity, never
 * a fabricated title-case of it.
 */
const StandardArticle = ({
  className,
  standard,
}: StandardArticleProps): React.ReactElement => {
  const data = useFragment<StandardArticle_standard$key>(
    standardArticleFragmentNode,
    standard,
  );
  const categorySlugs = data.categories.edges
    .map(({ node }) => node.slug)
    .filter((slug): slug is string => slug !== null && slug !== undefined);
  const extendsNodes = data.extends.edges.map(({ node }) => node);

  return (
    <article
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="reading-canvas"
    >
      <header className="standard-article-header">
        <h1 id="standard-reading-title">{data.name ?? data.uri}</h1>
        <p className="standard-article-meta">
          <code>{data.uri}</code>
          {categorySlugs.length > 0 ? (
            <span className="standard-article-categories">
              category: {categorySlugs.join(", ")}
            </span>
          ) : null}
        </p>
      </header>
      {data.description ? (
        <div className="standard-article-prose">
          {splitProseBlocks(data.description).map((block) => (
            <p key={block}>{block}</p>
          ))}
        </div>
      ) : (
        <p className="standard-article-prose">No description recorded.</p>
      )}
      {extendsNodes.length > 0 ? (
        <section
          aria-labelledby="standard-article-extends-title"
          className="standard-article-extends"
        >
          <h2 id="standard-article-extends-title">Extends</h2>
          {/* A standard may extend ITSELF here — `cs:react.component.
              structure.folder` does, live. That is real upstream data, so
              it renders as-is (a link back to this same page) rather than
              being filtered: the lens reports the graph, it does not
              quietly correct it. */}
          <ul>
            {extendsNodes.map((node) => (
              <li key={node.id}>
                <Link params={{ uri: node.uri }} to="standardEntity">
                  {node.name ?? node.uri}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
};

export default StandardArticle;
