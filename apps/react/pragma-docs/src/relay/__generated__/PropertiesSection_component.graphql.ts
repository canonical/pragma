/**
 * @generated SignedSource<<3e809ee3083317674144c3d15666c687>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type PropertiesSection_component$data = {
  readonly properties: ReadonlyArray<{
    readonly constraints: string | null | undefined;
    readonly defaultValue: string | null | undefined;
    readonly name: string | null | undefined;
    readonly optional: boolean | null | undefined;
    readonly propertyType: string | null | undefined;
    readonly summary: string | null | undefined;
  }>;
  readonly " $fragmentType": "PropertiesSection_component";
};
export type PropertiesSection_component$key = {
  readonly " $data"?: PropertiesSection_component$data;
  readonly " $fragmentSpreads": FragmentRefs<"PropertiesSection_component">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "PropertiesSection_component",
  "selections": [
    {
      "alias": null,
      "args": null,
      "concreteType": "Property",
      "kind": "LinkedField",
      "name": "properties",
      "plural": true,
      "selections": [
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "name",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "propertyType",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "optional",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "defaultValue",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "constraints",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "summary",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Component",
  "abstractKey": null
};

(node as any).hash = "cb110766f524018b41e45bd863d0d9d7";

export default node;
