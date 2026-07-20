/**
 * @generated SignedSource<<51afab16c9d87f80c4ad50267e465941>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type CatalogList_query$data = {
  readonly components: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly id: string;
        readonly tier: {
          readonly name: string | null | undefined;
        } | null | undefined;
        readonly " $fragmentSpreads": FragmentRefs<"CatalogItem_component">;
      };
    }>;
  };
  readonly " $fragmentType": "CatalogList_query";
};
export type CatalogList_query$key = {
  readonly " $data"?: CatalogList_query$data;
  readonly " $fragmentSpreads": FragmentRefs<"CatalogList_query">;
};

import CatalogListPaginationQuery_graphql from './CatalogListPaginationQuery.graphql';

const node: ReaderFragment = (function(){
var v0 = [
  "components"
];
return {
  "argumentDefinitions": [
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "count"
    },
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "cursor"
    }
  ],
  "kind": "Fragment",
  "metadata": {
    "connection": [
      {
        "count": "count",
        "cursor": "cursor",
        "direction": "forward",
        "path": (v0/*:: as any*/)
      }
    ],
    "refetch": {
      "connection": {
        "forward": {
          "count": "count",
          "cursor": "cursor"
        },
        "backward": null,
        "path": (v0/*:: as any*/)
      },
      "fragmentPathInResult": [],
      "operation": CatalogListPaginationQuery_graphql
    }
  },
  "name": "CatalogList_query",
  "selections": [
    {
      "alias": "components",
      "args": null,
      "concreteType": "ComponentConnection",
      "kind": "LinkedField",
      "name": "__CatalogList_components_connection",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "ComponentEdge",
          "kind": "LinkedField",
          "name": "edges",
          "plural": true,
          "selections": [
            {
              "alias": null,
              "args": null,
              "concreteType": "Component",
              "kind": "LinkedField",
              "name": "node",
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
                  "concreteType": "Tier",
                  "kind": "LinkedField",
                  "name": "tier",
                  "plural": false,
                  "selections": [
                    {
                      "alias": null,
                      "args": null,
                      "kind": "ScalarField",
                      "name": "name",
                      "storageKey": null
                    }
                  ],
                  "storageKey": null
                },
                {
                  "args": null,
                  "kind": "FragmentSpread",
                  "name": "CatalogItem_component"
                },
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "__typename",
                  "storageKey": null
                }
              ],
              "storageKey": null
            },
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "cursor",
              "storageKey": null
            }
          ],
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "concreteType": "PageInfo",
          "kind": "LinkedField",
          "name": "pageInfo",
          "plural": false,
          "selections": [
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "endCursor",
              "storageKey": null
            },
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "hasNextPage",
              "storageKey": null
            }
          ],
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Query",
  "abstractKey": null
};
})();

(node as any).hash = "336f8fee3ebde618b18490b8bae46791";

export default node;
