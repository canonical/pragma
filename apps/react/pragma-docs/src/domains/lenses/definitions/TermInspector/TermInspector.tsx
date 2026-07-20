import { Link } from "@canonical/router-react";
import type React from "react";
import { graphql, useFragment } from "react-relay";
import type {
  TermInspector_class$data,
  TermInspector_class$key,
} from "#relay/__generated__/TermInspector_class.graphql.js";
import termInspectorClassFragmentNode from "#relay/__generated__/TermInspector_class.graphql.js";
import type {
  TermInspector_property$data,
  TermInspector_property$key,
} from "#relay/__generated__/TermInspector_property.graphql.js";
import termInspectorPropertyFragmentNode from "#relay/__generated__/TermInspector_property.graphql.js";
import { type OntologyNamespace, toPrefixedUri } from "../uris.js";
import type { TermInspectorProps } from "./types.js";
import "./styles.css";

/**
 * Codegen sources of truth for the inspector's TWO fragments — the term
 * route's lookup is a union-by-hand (`ontologyClass` OR `ontologyProperty`,
 * whichever is non-null), so the inspector masks one fragment per shape
 * and picks whichever key it was handed. Ontology types carry NO Node ids
 * (plain fragments, no @refetchable). Never invoked.
 */
const termInspectorClassFragmentSource = (): unknown => graphql`
  fragment TermInspector_class on OntologyClass {
    uri
    label
    definition
    isAbstract
    namespace
    instanceCount
    superclass {
      uri
      label
    }
    superclasses {
      uri
      label
    }
    subclasses {
      uri
      label
    }
    properties {
      required
      singular
      inherited
      property {
        uri
        label
        definition
        range
        kind
      }
    }
    instances(first: 12) {
      edges {
        node {
          __typename
          id
          uri
          ... on Entity {
            name
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
void termInspectorClassFragmentSource;

const termInspectorPropertyFragmentSource = (): unknown => graphql`
  fragment TermInspector_property on OntologyProperty {
    uri
    label
    definition
    kind
    functional
    range
    namespace
    domain {
      uri
      label
    }
    inverse {
      uri
      label
    }
    acceptanceCriteria
    completionGuidance
  }
`;
void termInspectorPropertyFragmentSource;

const componentCssClassName = "ds term-inspector";

/** A term link for a related class/property, labelled by the graph. */
const TermLink = ({
  uri,
  label,
  namespaces,
}: {
  readonly uri: string;
  readonly label: string | null | undefined;
  readonly namespaces: readonly OntologyNamespace[];
}): React.ReactElement => {
  const prefixed = toPrefixedUri(uri, namespaces);
  return (
    <Link params={{ term: prefixed }} to="definitionsTerm">
      {label ?? prefixed}
    </Link>
  );
};

/** `https://…/Subcomponent` → `ds:Subcomponent`; datatype ranges (e.g.
 * `xsd:string` shapes) pass through the codec unchanged. */
const rangeDisplay = (
  range: string,
  namespaces: readonly OntologyNamespace[],
): string => toPrefixedUri(range, namespaces);

/**
 * Instance links land only where a live route exists (the D31 landing
 * rule: a mention links to the noun's home, and only components have one
 * — `/components/:uri`). Every other instance renders as plain text until
 * its lens lands.
 */
const InstanceItem = ({
  node,
}: {
  readonly node: {
    readonly __typename: string;
    readonly uri: string;
    readonly name?: string | null | undefined;
  };
}): React.ReactElement => {
  const display = node.name ?? node.uri;
  if (node.__typename === "Component") {
    return (
      <li>
        <Link params={{ uri: node.uri }} to="componentEntity">
          {display}
        </Link>{" "}
        <code>{node.uri}</code>
      </li>
    );
  }
  return (
    <li>
      {display} <code>{node.uri}</code>
    </li>
  );
};

const ClassView = ({
  data,
  term,
  namespaces,
}: {
  readonly data: TermInspector_class$data;
  readonly term: string;
  readonly namespaces: readonly OntologyNamespace[];
}): React.ReactElement => (
  <article aria-labelledby="term-inspector-title">
    <header>
      <h2 id="term-inspector-title">{data.label ?? term}</h2>
      <p>
        <code>{term}</code> · class in <code>{data.namespace}</code>
        {data.isAbstract ? " · abstract" : ""}
      </p>
    </header>
    <p>{data.definition ?? "No definition recorded."}</p>
    <h3>Superclasses</h3>
    {data.superclasses.length === 0 ? (
      <p>None — a root of its ontology.</p>
    ) : (
      <ul>
        {data.superclasses.map((superclass) => (
          <li key={superclass.uri}>
            <TermLink
              label={superclass.label}
              namespaces={namespaces}
              uri={superclass.uri}
            />
            {superclass.uri === data.superclass?.uri ? " (direct)" : ""}
          </li>
        ))}
      </ul>
    )}
    <h3>Subclasses</h3>
    {data.subclasses.length === 0 ? (
      <p>None.</p>
    ) : (
      <ul>
        {data.subclasses.map((subclass) => (
          <li key={subclass.uri}>
            <TermLink
              label={subclass.label}
              namespaces={namespaces}
              uri={subclass.uri}
            />
          </li>
        ))}
      </ul>
    )}
    <h3>Properties</h3>
    {data.properties.length === 0 ? (
      <p>None.</p>
    ) : (
      <table>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Range</th>
            <th scope="col">Kind</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.properties.map((classProperty) => (
            <tr key={classProperty.property.uri}>
              <th scope="row">
                <TermLink
                  label={classProperty.property.label}
                  namespaces={namespaces}
                  uri={classProperty.property.uri}
                />
              </th>
              <td>
                <code>
                  {rangeDisplay(classProperty.property.range, namespaces)}
                </code>
              </td>
              <td>{classProperty.property.kind.toLowerCase()}</td>
              <td>
                {[
                  classProperty.required ? "required" : "",
                  classProperty.singular ? "singular" : "",
                  classProperty.inherited ? "inherited" : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
    <h3>Instances</h3>
    {data.instances.edges.length === 0 ? (
      <p>
        No named instances ({data.instanceCount} recorded
        {data.instanceCount === 0
          ? ""
          : " — blank-node instances are embeddable, not standalone"}
        ).
      </p>
    ) : (
      <>
        <ul>
          {data.instances.edges.map(({ node }) => (
            <InstanceItem key={node.id} node={node} />
          ))}
        </ul>
        {data.instances.pageInfo.hasNextPage ? (
          <p>…and more — {data.instanceCount} named instances in the graph.</p>
        ) : null}
      </>
    )}
  </article>
);

const PropertyView = ({
  data,
  term,
  namespaces,
}: {
  readonly data: TermInspector_property$data;
  readonly term: string;
  readonly namespaces: readonly OntologyNamespace[];
}): React.ReactElement => (
  <article aria-labelledby="term-inspector-title">
    <header>
      <h2 id="term-inspector-title">{data.label ?? term}</h2>
      <p>
        <code>{term}</code> · property in <code>{data.namespace}</code>
      </p>
    </header>
    <p>{data.definition ?? "No definition recorded."}</p>
    <dl>
      <dt>Kind</dt>
      <dd>{data.kind.toLowerCase()}</dd>
      <dt>Functional</dt>
      <dd>{data.functional ? "yes" : "no"}</dd>
      <dt>Range</dt>
      <dd>
        <code>{rangeDisplay(data.range, namespaces)}</code>
      </dd>
      <dt>Domain</dt>
      <dd>
        {data.domain ? (
          <TermLink
            label={data.domain.label}
            namespaces={namespaces}
            uri={data.domain.uri}
          />
        ) : (
          "unstated"
        )}
      </dd>
      <dt>Inverse</dt>
      <dd>
        {data.inverse ? (
          <TermLink
            label={data.inverse.label}
            namespaces={namespaces}
            uri={data.inverse.uri}
          />
        ) : (
          "none"
        )}
      </dd>
      <dt>Acceptance criteria</dt>
      <dd>{data.acceptanceCriteria ?? "none recorded"}</dd>
      <dt>Completion guidance</dt>
      <dd>{data.completionGuidance ?? "none recorded"}</dd>
    </dl>
  </article>
);

/**
 * The explorer's east panel: the selected term's full record — class or
 * property, whichever the lookup resolved. Governance/status fields do
 * not exist on the ontology surface, so no such sockets are faked here;
 * the strip's controls/status stay honestly empty.
 *
 * `aria-live="polite"`: term switches swap this panel's content in place,
 * and the announcement is the inspector's, not the whole canvas's.
 */
const TermInspector = ({
  className,
  term,
  classRef,
  propertyRef,
  namespaces,
}: TermInspectorProps): React.ReactElement => {
  const classData = useFragment(
    termInspectorClassFragmentNode,
    (classRef ?? null) as TermInspector_class$key | null,
  );
  const propertyData = useFragment(
    termInspectorPropertyFragmentNode,
    (propertyRef ?? null) as TermInspector_property$key | null,
  );

  let body: React.ReactElement;
  if (term === undefined) {
    // No default term (owner ruling): /definitions is the whole explorer
    // with an honestly empty inspector, never a redirect.
    body = (
      <p className="term-inspector-empty">
        Select a term — from the rail or the hierarchy — to inspect its
        definition, relations, and instances.
      </p>
    );
  } else if (classData) {
    body = <ClassView data={classData} namespaces={namespaces} term={term} />;
  } else if (propertyData) {
    body = (
      <PropertyView data={propertyData} namespaces={namespaces} term={term} />
    );
  } else {
    // Unknown term: a 200 with an honest alert (the R4 posture — the term
    // space is the graph's, not the router's).
    body = (
      <p role="alert">
        No term at <code>{term}</code>. The rail lists every term the ontologies
        carry.
      </p>
    );
  }

  return (
    <aside
      aria-label="Term inspector"
      aria-live="polite"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="explorer-inspector"
    >
      {body}
    </aside>
  );
};

export default TermInspector;
