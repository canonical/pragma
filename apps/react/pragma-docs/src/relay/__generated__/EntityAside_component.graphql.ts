/**
 * @generated SignedSource<<0ae3570fe8392808418e4293ad98777e>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type EntityAside_component$data = {
  readonly _meta: {
    readonly curie: string;
  };
  readonly tier: {
    readonly _meta: {
      readonly curie: string;
    };
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
},
v1 = {
  "alias": null,
  "args": null,
  "concreteType": "EntityMeta",
  "kind": "LinkedField",
  "name": "_meta",
  "plural": false,
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "curie",
      "storageKey": null
    }
  ],
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "EntityAside_component",
  "selections": [
    (v0/*:: as any*/),
    (v1/*:: as any*/),
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
        },
        (v1/*:: as any*/)
      ],
      "storageKey": null
    }
  ],
  "type": "Component",
  "abstractKey": null
};
})();

(node as any).hash = "a6ef26bfe59103c6bf5f07c8f34f8a81";

export default node;
