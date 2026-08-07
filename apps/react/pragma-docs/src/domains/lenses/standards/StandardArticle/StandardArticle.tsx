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
 * invoked.
 *
 * THE FRAGMENT IS ON `Node`, not on `CodeStandard`. `CodeStandard` is an
 * ontology-derived type that exists only on a provider that loaded
 * pragma's `cs:` vocabulary; `Node` is the contract's own interface, and
 * everything this article renders is on `_meta`.
 *
 * The prose survives the move with no ontology change. ke-graphql's
 * fallback tiers are `DEFINITION_LOCAL_NAMES = ["description"]` and
 * `LABEL_LOCAL_NAMES = ["name", "title"]`, and `CodeStandard` carries both
 * `description` and `name` — so `_meta.definition` resolves the standard's
 * `cs:description` and `_meta.title` its `cs:name` through the compiler's
 * local-name tier. UNVERIFIED HERE against a live boot (no `code-standards`
 * package in this environment); if it turns out the instance asserts no
 * `skos:definition` AND the class declares no `graphql:definitionFrom`,
 * the fix is that annotation upstream, not a change in this file.
 */
const standardArticleFragmentSource = (): unknown => graphql`
  fragment StandardArticle_standard on Node {
    uri
    _meta {
      curie
      title
      definition
      type {
        uri
        _meta {
          title
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
 * identity header (title, compact URI, the entity's class) and the
 * standard's prose.
 *
 * Prose is the graph's `_meta.definition` rendered as PLAIN TEXT paragraph
 * blocks — deliberately no markdown pipeline (the R8 precedent defers
 * one), so inline backticks and `*emphasis*` marks in the source text
 * show verbatim. Honest over pretty until a sanctioned renderer lands.
 * The title is `_meta.title`, which is TOTAL: the provider computes a
 * fallback chain whose tail is the IRI local name, never the full IRI, so
 * there is no `??` arm and never a fabricated title-case. `_meta.curie` carries the compact identity for
 * the reader while `uri` stays the absolute IRI Relay keys on — and, now,
 * the address `node(id:)` accepts.
 */
const StandardArticle = ({
  className,
  standard,
}: StandardArticleProps): React.ReactElement => {
  const data = useFragment<StandardArticle_standard$key>(
    standardArticleFragmentNode,
    standard,
  );

  return (
    <article
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="reading-canvas"
    >
      <header className="standard-article-header">
        <h1 id="standard-reading-title">{data._meta.title}</h1>
        <p className="standard-article-meta">
          <code>{data._meta.curie}</code>
          {/* The class replaces the category line. `CodeStandard.categories`
              is an ontology-derived relation the contract cannot traverse,
              and the instance's own class is the only grouping axis it does
              expose — the same axis the index now groups by. */}
          <span className="standard-article-categories">
            class: {data._meta.type._meta.title}
          </span>
        </p>
      </header>
      {data._meta.definition ? (
        <div className="standard-article-prose">
          {splitProseBlocks(data._meta.definition).map((block) => (
            <p key={block}>{block}</p>
          ))}
        </div>
      ) : (
        <p className="standard-article-prose">No description recorded.</p>
      )}
    </article>
  );
};

export default StandardArticle;
