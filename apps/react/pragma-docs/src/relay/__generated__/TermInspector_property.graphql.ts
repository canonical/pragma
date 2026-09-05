/**
 * @generated SignedSource<<14113f12133b02b3a11cd0d3f2eef9fb>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type PropertyKind = "ANNOTATION" | "DATATYPE" | "OBJECT" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type TermInspector_property$data = {
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
    }
  ],
  "type": "OntologyProperty",
  "abstractKey": null
};
})();

(node as any).hash = "39c51e1c0d552781827434b5487f11da";

export default node;
