/**
 * @generated SignedSource<<759f0a9d3f81281fd7a80ea78da44c41>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type PropertyKind = "ANNOTATION" | "DATATYPE" | "OBJECT" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type HierarchyWell_ontologies$data = ReadonlyArray<{
  readonly classes: ReadonlyArray<{
    readonly isAbstract: boolean;
    readonly label: string | null | undefined;
    readonly superclass: {
      readonly uri: string;
    } | null | undefined;
    readonly uri: string;
  }>;
  readonly namespace: string;
  readonly prefix: string;
  readonly properties: ReadonlyArray<{
    readonly domain: {
      readonly uri: string;
    } | null | undefined;
    readonly kind: PropertyKind;
    readonly label: string | null | undefined;
    readonly range: string;
    readonly uri: string;
  }>;
  readonly " $fragmentType": "HierarchyWell_ontologies";
}>;
export type HierarchyWell_ontologies$key = ReadonlyArray<{
  readonly " $data"?: HierarchyWell_ontologies$data;
  readonly " $fragmentSpreads": FragmentRefs<"HierarchyWell_ontologies">;
}>;

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "label",
  "storageKey": null
},
v2 = [
  (v0/*:: as any*/)
];
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": {
    "plural": true
  },
  "name": "HierarchyWell_ontologies",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "prefix",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "namespace",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "OntologyClass",
      "kind": "LinkedField",
      "name": "classes",
      "plural": true,
      "selections": [
        (v0/*:: as any*/),
        (v1/*:: as any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "isAbstract",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "concreteType": "OntologyClass",
          "kind": "LinkedField",
          "name": "superclass",
          "plural": false,
          "selections": (v2/*:: as any*/),
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "OntologyProperty",
      "kind": "LinkedField",
      "name": "properties",
      "plural": true,
      "selections": [
        (v0/*:: as any*/),
        (v1/*:: as any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "kind",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "concreteType": "OntologyClass",
          "kind": "LinkedField",
          "name": "domain",
          "plural": false,
          "selections": (v2/*:: as any*/),
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "range",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Ontology",
  "abstractKey": null
};
})();

(node as any).hash = "858740506ede5332b37108c70229694c";

export default node;
