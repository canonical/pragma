/**
 * @generated SignedSource<<168f6c1c7ce8a62f4c4667cab0f06f10>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type StandardEntityQuery$variables = {
  uri: string;
};
export type StandardEntityQuery$data = {
  readonly codeStandard: {
    readonly _meta: {
      readonly curie: string;
    };
    readonly name: string | null | undefined;
    readonly uri: string;
    readonly " $fragmentSpreads": FragmentRefs<"StandardArticle_standard">;
  } | null | undefined;
};
export type StandardEntityQuery = {
  response: StandardEntityQuery$data;
  variables: StandardEntityQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "uri"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "uri",
    "variableName": "uri"
  }
],
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v4 = {
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
v5 = [
  {
    "kind": "Literal",
    "name": "first",
    "value": 8
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "StandardEntityQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "CodeStandard",
        "kind": "LinkedField",
        "name": "codeStandard",
        "plural": false,
        "selections": [
          (v2/*:: as any*/),
          (v3/*:: as any*/),
          (v4/*:: as any*/),
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "StandardArticle_standard"
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*:: as any*/),
    "kind": "Operation",
    "name": "StandardEntityQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*:: as any*/),
        "concreteType": "CodeStandard",
        "kind": "LinkedField",
        "name": "codeStandard",
        "plural": false,
        "selections": [
          (v2/*:: as any*/),
          (v3/*:: as any*/),
          (v4/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "description",
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v5/*:: as any*/),
            "concreteType": "CategoryConnection",
            "kind": "LinkedField",
            "name": "categories",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "CategoryEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Category",
                    "kind": "LinkedField",
                    "name": "node",
                    "plural": false,
                    "selections": [
                      (v3/*:: as any*/),
                      {
                        "alias": null,
                        "args": null,
                        "kind": "ScalarField",
                        "name": "slug",
                        "storageKey": null
                      }
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": "categories(first:8)"
          },
          {
            "alias": null,
            "args": (v5/*:: as any*/),
            "concreteType": "CodeStandardConnection",
            "kind": "LinkedField",
            "name": "extends",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "CodeStandardEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "CodeStandard",
                    "kind": "LinkedField",
                    "name": "node",
                    "plural": false,
                    "selections": [
                      (v3/*:: as any*/),
                      (v4/*:: as any*/),
                      (v2/*:: as any*/)
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": "extends(first:8)"
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "b3729e75ac602ffa54a98f5735f41dd6",
    "id": null,
    "metadata": {},
    "name": "StandardEntityQuery",
    "operationKind": "query",
    "text": "query StandardEntityQuery(\n  $uri: String!\n) {\n  codeStandard(uri: $uri) {\n    name\n    uri\n    _meta {\n      curie\n    }\n    ...StandardArticle_standard\n  }\n}\n\nfragment StandardArticle_standard on CodeStandard {\n  uri\n  _meta {\n    curie\n  }\n  name\n  description\n  categories(first: 8) {\n    edges {\n      node {\n        uri\n        slug\n      }\n    }\n  }\n  extends(first: 8) {\n    edges {\n      node {\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "603fb73e73c115031860f50e25f0a415";

export default node;
