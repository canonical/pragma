/**
 * A serialised Relay store snapshot for `StandardEntityQuery` at
 * { uri: "cs:react.component.link_component" } — captured VERBATIM from a
 * dev server's `__INITIAL_DATA__.relay.records` at
 * /standards/cs%3Areact.component.link_component (the output of the
 * prepare step's `getStore().getSource().toJSON()`). Nothing trimmed:
 * the reading page's one operation carries the standard's identity, the
 * full description prose, its category, and its one `extends` target
 * (cs:react.component.props), and the hydration/frame certifications
 * replay these exact bytes.
 *
 * The exemplar is deliberate: the longest live description (paragraph
 * breaks AND inline code marks — the plain-text prose rendering shows
 * both) and one of the seven standards that carry `extends`.
 *
 * Regenerate: boot `dev:bun`, copy `relay.records` out of the
 * `__INITIAL_DATA__` script served at
 * /standards/cs%3Areact.component.link_component.
 */

import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";

const standardEntityRecords = {
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta",
      __typename: "EntityMeta",
      curie: "cs:react.component.link_component",
    },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:8)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:8)",
      __typename: "CategoryConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:8):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:8):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:8):edges:0",
      __typename: "CategoryEdge",
      node: {
        __ref: "http://pragma.canonical.com/codestandards#react",
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:extends(first:8)":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:extends(first:8)",
      __typename: "CodeStandardConnection",
      edges: {
        __refs: [
          "client:http://pragma.canonical.com/codestandards#react.component.link_component:extends(first:8):edges:0",
        ],
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.link_component:extends(first:8):edges:0":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.link_component:extends(first:8):edges:0",
      __typename: "CodeStandardEdge",
      node: {
        __ref:
          "http://pragma.canonical.com/codestandards#react.component.props",
      },
    },
  "client:http://pragma.canonical.com/codestandards#react.component.props:_meta":
    {
      __id: "client:http://pragma.canonical.com/codestandards#react.component.props:_meta",
      __typename: "EntityMeta",
      curie: "cs:react.component.props",
    },
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'codeStandard(uri:"cs:react.component.link_component")': {
      __ref:
        "http://pragma.canonical.com/codestandards#react.component.link_component",
    },
  },
  "http://pragma.canonical.com/codestandards#react": {
    __id: "http://pragma.canonical.com/codestandards#react",
    __typename: "Category",
    uri: "http://pragma.canonical.com/codestandards#react",
    slug: "react",
  },
  "http://pragma.canonical.com/codestandards#react.component.link_component": {
    __id: "http://pragma.canonical.com/codestandards#react.component.link_component",
    __typename: "CodeStandard",
    name: null,
    uri: "http://pragma.canonical.com/codestandards#react.component.link_component",
    description:
      'A *complex* component — one that renders a set of navigable items (a list, tree, tab strip, breadcrumb trail, menu) and injects an inner link renderer for them — MUST integrate with a consumer\'s router through a single `LinkComponent` prop against the shared `LinkComponentProps` contract, NOT through a per-component re-authored interface and NOT through the polymorphic `as` prop. (A *simple* component that merely re-targets its own wrapper element uses `as` instead — see the boundary below.)\n\nThe contract is deliberately narrow: `LinkComponent?: ComponentType<LinkComponentProps> | "a"`, defaulting to the intrinsic `"a"`. `LinkComponentProps` forwards only `href`, `className`, `children`, and `aria-current` — not the full anchor attribute set — so the same router `Link` adapter works across every component that uses it. Define `LinkComponentProps` once in a shared location and import it; do not copy the interface per component.\n\nBoundary with the polymorphic `as` prop — the deciding question is *what is being configured*: the component\'s own wrapper element, or an inner link renderer among other structure.\n\n- **Simple component → `as`.** When the component IS the element (its own root wrapper is what gets swapped for the consumer\'s link/element — e.g. a `Link`, `Button`, `Box`, or any single-element component the consumer re-targets), use the polymorphic `as`/`ElementType` prop. The consumer configures the wrapper directly.\n- **Complex component → `LinkComponent`.** When the component renders multiple navigable items and injects ONE inner link renderer for each (a list, tree, tab strip, breadcrumb trail, menu), use `LinkComponent`. Here `as` would be wrong: there is no single wrapper to re-target, and threading `as`-style generics through the subcomponents to reach each inner link is the anti-pattern this standard exists to prevent.\n\nFallback semantics: a non-navigable item (one with no `url`/`href`) MUST render a plain element such as `<span>` — never the injected link, and never a `<button>`. When an item is disabled, its `href` is omitted. Active state drives `aria-current` (e.g. `"page"`) on the rendered link.',
    "categories(first:8)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.link_component:categories(first:8)",
    },
    "extends(first:8)": {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.link_component:extends(first:8)",
    },
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.link_component:_meta",
    },
  },
  "http://pragma.canonical.com/codestandards#react.component.props": {
    __id: "http://pragma.canonical.com/codestandards#react.component.props",
    __typename: "CodeStandard",
    uri: "http://pragma.canonical.com/codestandards#react.component.props",
    name: null,
    _meta: {
      __ref:
        "client:http://pragma.canonical.com/codestandards#react.component.props:_meta",
    },
  },
} as unknown as RecordMap;

export default standardEntityRecords;
