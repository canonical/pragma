/**
 * @generated SignedSource<<c6628043969f3e7467e29620056feaef>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type PropertyKind = "ANNOTATION" | "DATATYPE" | "OBJECT" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type TermRail_ontologies$data = ReadonlyArray<{
  readonly classes: ReadonlyArray<{
    readonly instanceCount: number;
    readonly isAbstract: boolean;
    readonly label: string | null | undefined;
    readonly uri: string;
  }>;
  readonly label: string | null | undefined;
  readonly namespace: string;
  readonly prefix: string;
  readonly properties: ReadonlyArray<{
    readonly kind: PropertyKind;
    readonly label: string | null | undefined;
    readonly uri: string;
  }>;
  readonly " $fragmentType": "TermRail_ontologies";
}>;
export type TermRail_ontologies$key = ReadonlyArray<{
  readonly " $data"?: TermRail_ontologies$data;
  readonly " $fragmentSpreads": FragmentRefs<"TermRail_ontologies">;
}>;

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "label",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": {
    "plural": true
  },
  "name": "TermRail_ontologies",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "prefix",
      "storageKey": null
    },
    (v0/*:: as any*/),
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
        (v1/*:: as any*/),
        (v0/*:: as any*/),
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
          "kind": "ScalarField",
          "name": "instanceCount",
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
        (v1/*:: as any*/),
        (v0/*:: as any*/),
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "kind",
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

(node as any).hash = "50952e58be106a45372fe68ffeceef56";

export default node;
