/**
 * @generated SignedSource<<9ecf99ef7ca253da1edba5b20c53c9b4>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type StandardsIndexQuery$variables = {
  classUri: string;
  count: number;
  cursor?: string | null | undefined;
};
export type StandardsIndexQuery$data = {
  readonly " $fragmentSpreads": FragmentRefs<"StandardsIndex_query">;
};
export type StandardsIndexQuery = {
  response: StandardsIndexQuery$data;
  variables: StandardsIndexQuery$variables;
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
    "name": "StandardsIndexQuery",
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
    "name": "StandardsIndexQuery",
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
    "cacheID": "941d97cca115e27876b6151f48a96cee",
    "id": null,
    "metadata": {},
    "name": "StandardsIndexQuery",
    "operationKind": "query",
    "text": "query StandardsIndexQuery(\n  $classUri: String!\n  $count: Int!\n  $cursor: String\n) {\n  ...StandardsIndex_query_1XDTmS\n}\n\nfragment StandardsIndex_query_1XDTmS on Query {\n  ontologyClass(uri: $classUri) {\n    uri\n    instances(first: $count, after: $cursor) {\n      edges {\n        node {\n          __typename\n          uri\n          _meta {\n            curie\n            title\n            type {\n              uri\n              _meta {\n                title\n              }\n            }\n          }\n        }\n        cursor\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "22230b72d617a73e3ffbb16633e299f9";

export default node;
