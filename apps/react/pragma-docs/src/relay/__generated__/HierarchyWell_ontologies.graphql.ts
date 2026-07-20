/**
 * @generated SignedSource<<858b78041c6005a4b4d90265799971e6>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
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
};
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
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "label",
          "storageKey": null
        },
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
          "selections": [
            (v0/*:: as any*/)
          ],
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

(node as any).hash = "3cc1bd1c72092f91c6ad2f8882ca85d7";

export default node;
