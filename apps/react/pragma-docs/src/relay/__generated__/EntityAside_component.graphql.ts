/**
 * @generated SignedSource<<cd59af10f142fa2e79f1019316c9cee5>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type EntityAside_component$data = {
  readonly tier: {
    readonly id: string;
    readonly name: string | null | undefined;
  } | null | undefined;
  readonly uri: string;
  readonly version: string | null | undefined;
  readonly " $fragmentType": "EntityAside_component";
};
export type EntityAside_component$key = {
  readonly " $data"?: EntityAside_component$data;
  readonly " $fragmentSpreads": FragmentRefs<"EntityAside_component">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "EntityAside_component",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "uri",
      "storageKey": null
    },
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
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "id",
          "storageKey": null
        },
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

(node as any).hash = "6c84dbe668bebf48fe49392fda38d5b5";

export default node;
