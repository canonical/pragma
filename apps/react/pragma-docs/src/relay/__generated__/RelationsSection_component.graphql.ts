/**
 * @generated SignedSource<<c014bbbf5d6eea089b1539fb7f7676ed>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type RelationsSection_component$data = {
  readonly modifierFamilies: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly _meta: {
          readonly curie: string;
        };
        readonly name: string | null | undefined;
        readonly uri: string;
      };
    }>;
  };
  readonly subcomponents: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly _meta: {
          readonly curie: string;
        };
        readonly name: string | null | undefined;
        readonly uri: string;
      };
    }>;
  };
  readonly " $fragmentType": "RelationsSection_component";
};
export type RelationsSection_component$key = {
  readonly " $data"?: RelationsSection_component$data;
  readonly " $fragmentSpreads": FragmentRefs<"RelationsSection_component">;
};

const node: ReaderFragment = (function(){
var v0 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
],
v1 = [
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
  },
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "name",
    "storageKey": null
  }
];
return {
  "argumentDefinitions": [
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "count"
    }
  ],
  "kind": "Fragment",
  "metadata": null,
  "name": "RelationsSection_component",
  "selections": [
    {
      "alias": null,
      "args": (v0/*:: as any*/),
      "concreteType": "SubcomponentConnection",
      "kind": "LinkedField",
      "name": "subcomponents",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "SubcomponentEdge",
          "kind": "LinkedField",
          "name": "edges",
          "plural": true,
          "selections": [
            {
              "alias": null,
              "args": null,
              "concreteType": "Subcomponent",
              "kind": "LinkedField",
              "name": "node",
              "plural": false,
              "selections": (v1/*:: as any*/),
              "storageKey": null
            }
          ],
          "storageKey": null
        }
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v0/*:: as any*/),
      "concreteType": "ModifierFamilyConnection",
      "kind": "LinkedField",
      "name": "modifierFamilies",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "ModifierFamilyEdge",
          "kind": "LinkedField",
          "name": "edges",
          "plural": true,
          "selections": [
            {
              "alias": null,
              "args": null,
              "concreteType": "ModifierFamily",
              "kind": "LinkedField",
              "name": "node",
              "plural": false,
              "selections": (v1/*:: as any*/),
              "storageKey": null
            }
          ],
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

(node as any).hash = "1d05b0de691e2a135f65c7a9452fecff";

export default node;
