/**
 * @generated SignedSource<<dc7a55f6acfd5c47fc7ef17e36abaf28>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type StandardsIndexPaginationQuery$variables = {
  classUri: string;
  count: number;
  cursor?: string | null | undefined;
};
export type StandardsIndexPaginationQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"StandardsIndex_query">;
};
export type StandardsIndexPaginationQuery = {
  response: StandardsIndexPaginationQuery$data;
  variables: StandardsIndexPaginationQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "classUri"
  },
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
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v2 = [
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
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "title",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "StandardsIndexPaginationQuery",
    "selections": [
      {
        "args": [
          {
            "kind": "Variable",
            "name": "classUri",
            "variableName": "classUri"
          },
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
        "name": "StandardsIndex_query"
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "StandardsIndexPaginationQuery",
    "selections": [
      {
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "uri",
            "variableName": "classUri"
          }
        ],
        "concreteType": "OntologyClass",
        "kind": "LinkedField",
        "name": "ontologyClass",
        "plural": false,
        "selections": [
          (v1/*:: as any*/),
          {
            "alias": null,
            "args": (v2/*:: as any*/),
            "concreteType": "NodeConnection",
            "kind": "LinkedField",
            "name": "instances",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "NodeEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": null,
                    "kind": "LinkedField",
                    "name": "node",
                    "plural": false,
                    "selections": [
                      {
                        "alias": null,
                        "args": null,
                        "kind": "ScalarField",
                        "name": "__typename",
                        "storageKey": null
                      },
                      (v1/*:: as any*/),
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
                          },
                          (v3/*:: as any*/),
                          {
                            "alias": null,
                            "args": null,
                            "concreteType": "OntologyClass",
                            "kind": "LinkedField",
                            "name": "type",
                            "plural": false,
                            "selections": [
                              (v1/*:: as any*/),
                              {
                                "alias": null,
                                "args": null,
                                "concreteType": "EntityMeta",
                                "kind": "LinkedField",
                                "name": "_meta",
                                "plural": false,
                                "selections": [
                                  (v3/*:: as any*/)
                                ],
                                "storageKey": null
                              }
                            ],
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
            "args": (v2/*:: as any*/),
            "filters": null,
            "handle": "connection",
            "key": "StandardsIndex_instances",
            "kind": "LinkedHandle",
            "name": "instances"
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "051be8d514e4cd86ce5d50f346479ec9",
    "id": null,
    "metadata": {},
    "name": "StandardsIndexPaginationQuery",
    "operationKind": "query",
    "text": "query StandardsIndexPaginationQuery(\n  $classUri: String!\n  $count: Int!\n  $cursor: String\n) {\n  ...StandardsIndex_query_1XDTmS\n}\n\nfragment StandardsIndex_query_1XDTmS on Query {\n  ontologyClass(uri: $classUri) {\n    uri\n    instances(first: $count, after: $cursor) {\n      edges {\n        node {\n          __typename\n          uri\n          _meta {\n            curie\n            title\n            type {\n              uri\n              _meta {\n                title\n              }\n            }\n          }\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "494d460b165999637376e6e2aaf2d99a";

export default node;
