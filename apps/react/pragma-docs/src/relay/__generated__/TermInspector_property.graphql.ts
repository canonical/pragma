/**
 * @generated SignedSource<<5b72444919c0bc1f669214c18ad17c46>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type PropertyKind = "ANNOTATION" | "DATATYPE" | "OBJECT" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type TermInspector_property$data = {
  readonly acceptanceCriteria: string | null | undefined;
  readonly completionGuidance: string | null | undefined;
  readonly definition: string | null | undefined;
  readonly domain: {
    readonly label: string | null | undefined;
    readonly uri: string;
  } | null | undefined;
  readonly functional: boolean;
  readonly inverse: {
    readonly label: string | null | undefined;
    readonly uri: string;
  } | null | undefined;
  readonly kind: PropertyKind;
  readonly label: string | null | undefined;
  readonly namespace: string;
  readonly range: string;
  readonly uri: string;
  readonly " $fragmentType": "TermInspector_property";
};
export type TermInspector_property$key = {
  readonly " $data"?: TermInspector_property$data;
  readonly " $fragmentSpreads": FragmentRefs<"TermInspector_property">;
};

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
  (v0/*:: as any*/),
  (v1/*:: as any*/)
];
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "TermInspector_property",
  "selections": [
    (v0/*:: as any*/),
    (v1/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "definition",
      "storageKey": null
    },
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
      "kind": "ScalarField",
      "name": "functional",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "range",
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
      "name": "domain",
      "plural": false,
      "selections": (v2/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "OntologyProperty",
      "kind": "LinkedField",
      "name": "inverse",
      "plural": false,
      "selections": (v2/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "acceptanceCriteria",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "completionGuidance",
      "storageKey": null
    }
  ],
  "type": "OntologyProperty",
  "abstractKey": null
};
})();

(node as any).hash = "aa56c62bacf0903b0031dbfab758ce0e";

export default node;
