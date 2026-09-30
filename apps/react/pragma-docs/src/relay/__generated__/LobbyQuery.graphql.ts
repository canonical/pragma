/**
 * @generated SignedSource<<b9f0cd28d630ecb74dc9f2429ee521f6>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type LobbyQuery$variables = {
  componentClass: string;
  exemplars: number;
  patternClass: string;
  standardClass: string;
};
export type LobbyQuery$data = {
  readonly componentClass: {
    readonly instanceCount: number;
    readonly instances: {
      readonly edges: ReadonlyArray<{
        readonly node: {
          readonly __typename: "Component";
          readonly _meta: {
            readonly curie: string;
          };
          readonly name: string | null | undefined;
          readonly uri: string;
        } | {
          // This will never be '%other', but we need some
          // value in case none of the concrete values match.
          readonly __typename: "%other";
        };
      }>;
    };
  } | null | undefined;
  readonly patternClass: {
    readonly instanceCount: number;
  } | null | undefined;
  readonly standardClass: {
    readonly instanceCount: number;
  } | null | undefined;
};
export type LobbyQuery = {
  response: LobbyQuery$data;
  variables: LobbyQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "componentClass"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "exemplars"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "patternClass"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "standardClass"
},
v4 = [
  {
    "kind": "Variable",
    "name": "uri",
    "variableName": "componentClass"
  }
],
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "instanceCount",
  "storageKey": null
},
v6 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "exemplars"
  }
],
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "__typename",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v9 = {
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
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v11 = [
  {
    "kind": "Variable",
    "name": "uri",
    "variableName": "patternClass"
  }
],
v12 = [
  (v5/*:: as any*/)
],
v13 = [
  {
    "kind": "Variable",
    "name": "uri",
    "variableName": "standardClass"
  }
],
v14 = [
  (v5/*:: as any*/),
  (v8/*:: as any*/)
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/),
      (v2/*:: as any*/),
      (v3/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "LobbyQuery",
    "selections": [
      {
        "alias": "componentClass",
        "args": (v4/*:: as any*/),
        "concreteType": "OntologyClass",
        "kind": "LinkedField",
        "name": "ontologyClass",
        "plural": false,
        "selections": [
          (v5/*:: as any*/),
          {
            "alias": null,
            "args": (v6/*:: as any*/),
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
                      (v7/*:: as any*/),
                      {
                        "kind": "InlineFragment",
                        "selections": [
                          (v8/*:: as any*/),
                          (v9/*:: as any*/),
                          (v10/*:: as any*/)
                        ],
                        "type": "Component",
                        "abstractKey": null
                      }
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
        "alias": "patternClass",
        "args": (v11/*:: as any*/),
        "concreteType": "OntologyClass",
        "kind": "LinkedField",
        "name": "ontologyClass",
        "plural": false,
        "selections": (v12/*:: as any*/),
        "storageKey": null
      },
      {
        "alias": "standardClass",
        "args": (v13/*:: as any*/),
        "concreteType": "OntologyClass",
        "kind": "LinkedField",
        "name": "ontologyClass",
        "plural": false,
        "selections": (v12/*:: as any*/),
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v2/*:: as any*/),
      (v3/*:: as any*/),
      (v1/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "LobbyQuery",
    "selections": [
      {
        "alias": "componentClass",
        "args": (v4/*:: as any*/),
        "concreteType": "OntologyClass",
        "kind": "LinkedField",
        "name": "ontologyClass",
        "plural": false,
        "selections": [
          (v5/*:: as any*/),
          {
            "alias": null,
            "args": (v6/*:: as any*/),
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
                      (v7/*:: as any*/),
                      (v8/*:: as any*/),
                      {
                        "kind": "InlineFragment",
                        "selections": [
                          (v9/*:: as any*/),
                          (v10/*:: as any*/)
                        ],
                        "type": "Component",
                        "abstractKey": null
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
          (v8/*:: as any*/)
        ],
        "storageKey": null
      },
      {
        "alias": "patternClass",
        "args": (v11/*:: as any*/),
        "concreteType": "OntologyClass",
        "kind": "LinkedField",
        "name": "ontologyClass",
        "plural": false,
        "selections": (v14/*:: as any*/),
        "storageKey": null
      },
      {
        "alias": "standardClass",
        "args": (v13/*:: as any*/),
        "concreteType": "OntologyClass",
        "kind": "LinkedField",
        "name": "ontologyClass",
        "plural": false,
        "selections": (v14/*:: as any*/),
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "18cf28d20104e19b0019c8ff5f6bad73",
    "id": null,
    "metadata": {},
    "name": "LobbyQuery",
    "operationKind": "query",
    "text": "query LobbyQuery(\n  $componentClass: String!\n  $patternClass: String!\n  $standardClass: String!\n  $exemplars: Int!\n) {\n  componentClass: ontologyClass(uri: $componentClass) {\n    instanceCount\n    instances(first: $exemplars) {\n      edges {\n        node {\n          __typename\n          ... on Component {\n            uri\n            _meta {\n              curie\n            }\n            name\n          }\n          uri\n        }\n      }\n    }\n    uri\n  }\n  patternClass: ontologyClass(uri: $patternClass) {\n    instanceCount\n    uri\n  }\n  standardClass: ontologyClass(uri: $standardClass) {\n    instanceCount\n    uri\n  }\n}\n"
  }
};
})();

(node as any).hash = "6fe7adfae605765c06171cbf64552e89";

export default node;
