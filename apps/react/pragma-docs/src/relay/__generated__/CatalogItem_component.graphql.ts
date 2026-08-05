/**
 * @generated SignedSource<<3a89cc8db01035470462fd84d18d9612>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type CatalogItem_component$data = {
  readonly name: string | null | undefined;
  readonly summary: string | null | undefined;
  readonly tier: {
    readonly name: string | null | undefined;
    readonly uri: string;
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
  "name": "uri",
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

(node as any).hash = "461dc7f748aed1828fdcc21c55b5fd46";

export default node;
