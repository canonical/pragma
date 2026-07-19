/**
 * @generated SignedSource<<e1ef94359c2664f6be513ebe6a2ad538>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type EntityHeader_component$data = {
  readonly name: string | null | undefined;
  readonly summary: string | null | undefined;
  readonly tier: {
    readonly id: string;
    readonly name: string | null | undefined;
  } | null | undefined;
  readonly uri: string;
  readonly " $fragmentType": "EntityHeader_component";
};
export type EntityHeader_component$key = {
  readonly " $data"?: EntityHeader_component$data;
  readonly " $fragmentSpreads": FragmentRefs<"EntityHeader_component">;
};

const node: ReaderFragment = (function(){
var v0 = {
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
  "name": "EntityHeader_component",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "uri",
      "storageKey": null
    },
    (v0/*:: as any*/),
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
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "id",
          "storageKey": null
        },
        (v0/*:: as any*/)
      ],
      "storageKey": null
    }
  ],
  "type": "Component",
  "abstractKey": null
};
})();

(node as any).hash = "899eb38f4ab031ab3e97b09a448c42e8";

export default node;
