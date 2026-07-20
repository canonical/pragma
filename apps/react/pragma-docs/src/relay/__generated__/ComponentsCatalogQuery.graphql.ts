/**
 * @generated SignedSource<<633a4d69b1b09eb2c18d78be46dcb947>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ComponentsCatalogQuery$variables = {
  count: number;
  cursor?: string | null | undefined;
};
export type ComponentsCatalogQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"CatalogList_query">;
};
export type ComponentsCatalogQuery = {
  response: ComponentsCatalogQuery$data;
  variables: ComponentsCatalogQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
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
v1 = [
  {
    "kind": "Variable",
    "name": "after",
    "variableName": "cursor"
  },
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
],
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "ComponentsCatalogQuery",
    "selections": [
      {
        "args": [
          {
            "kind": "Variable",
            "name": "count",
            "variableName": "count"
          },
          {
            "kind": "Variable",
            "name": "cursor",
            "variableName": "cursor"
          }
        ],
        "kind": "FragmentSpread",
        "name": "CatalogList_query"
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "ComponentsCatalogQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "ComponentConnection",
        "kind": "LinkedField",
        "name": "components",
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
                  (v2/*:: as any*/),
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Tier",
                    "kind": "LinkedField",
                    "name": "tier",
                    "plural": false,
                    "selections": [
                      (v3/*:: as any*/),
                      (v2/*:: as any*/)
                    ],
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "uri",
                    "storageKey": null
                  },
                  (v3/*:: as any*/),
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
      },
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "filters": null,
        "handle": "connection",
        "key": "CatalogList_components",
        "kind": "LinkedHandle",
        "name": "components"
      }
    ]
  },
  "params": {
    "cacheID": "591326cecaa0944e89354cc4953d57d0",
    "id": null,
    "metadata": {},
    "name": "ComponentsCatalogQuery",
    "operationKind": "query",
    "text": "query ComponentsCatalogQuery(\n  $count: Int!\n  $cursor: String\n) {\n  ...CatalogList_query_1G22uz\n}\n\nfragment CatalogItem_component on Component {\n  id\n  uri\n  name\n  summary\n  tier {\n    id\n    name\n  }\n}\n\nfragment CatalogList_query_1G22uz on Query {\n  components(first: $count, after: $cursor) {\n    edges {\n      node {\n        id\n        tier {\n          name\n          id\n        }\n        ...CatalogItem_component\n        __typename\n      }\n      cursor\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "31f2369c2c982562326ccdd3d7b9031c";

export default node;
