/**
 * @generated SignedSource<<3d5f21e119ffdb8b03984f814c1da1fd>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type CatalogItem_component$data = {
  readonly id: string;
  readonly name: string | null | undefined;
  readonly summary: string | null | undefined;
  readonly tier: {
    readonly id: string;
    readonly name: string | null | undefined;
  } | null | undefined;
  readonly uri: string;
  readonly " $fragmentType": "CatalogItem_component";
};
export type CatalogItem_component$key = {
  readonly " $data"?: CatalogItem_component$data;
  readonly " $fragmentSpreads": FragmentRefs<"CatalogItem_component">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "CatalogItem_component",
  "selections": [
    (v0/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "uri",
      "storageKey": null
    },
    (v1/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "summary",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "Tier",
      "kind": "LinkedField",
      "name": "tier",
      "plural": false,
      "selections": [
        (v0/*:: as any*/),
        (v1/*:: as any*/)
      ],
      "storageKey": null
    }
  ],
  "type": "Component",
  "abstractKey": null
};
})();

(node as any).hash = "b1cd7daf43af0414c4b4a47ee8081131";

export default node;
