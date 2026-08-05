/**
 * @generated SignedSource<<25ba7b4b06312fc5b2387c1aa0ac44f0>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type EntityAside_component$data = {
  readonly tier: {
    readonly name: string | null | undefined;
    readonly uri: string;
  } | null | undefined;
  readonly uri: string;
  readonly version: string | null | undefined;
  readonly " $fragmentType": "EntityAside_component";
};
export type EntityAside_component$key = {
  readonly " $data"?: EntityAside_component$data;
  readonly " $fragmentSpreads": FragmentRefs<"EntityAside_component">;
};

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
  "metadata": null,
  "name": "EntityAside_component",
  "selections": [
    (v0/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "version",
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
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "name",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Component",
  "abstractKey": null
};
})();

(node as any).hash = "12d5a94ce23b57912b22e370bfaffbdc";

export default node;
