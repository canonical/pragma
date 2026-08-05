/**
 * @generated SignedSource<<894ee3aac0db35b96f3ed5437323f861>>
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
    readonly name: string | null | undefined;
    readonly uri: string;
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
  "name": "EntityHeader_component",
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

(node as any).hash = "3d81931396a3e511b220ea5c2a57434e";

export default node;
