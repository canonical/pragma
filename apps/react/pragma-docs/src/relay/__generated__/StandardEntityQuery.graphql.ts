/**
 * @generated SignedSource<<2c93170b82a100caa1cdbcbb46955a67>>
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
    readonly id: string;
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
  "name": "id",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
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
                      (v2/*:: as any*/),
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
                      (v2/*:: as any*/),
                      (v4/*:: as any*/),
                      (v3/*:: as any*/)
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
    "cacheID": "4e7c02043eae88de872f97a588c2e5ee",
    "id": null,
    "metadata": {},
    "name": "StandardEntityQuery",
    "operationKind": "query",
    "text": "query StandardEntityQuery(\n  $uri: String!\n) {\n  codeStandard(uri: $uri) {\n    id\n    name\n    uri\n    ...StandardArticle_standard\n  }\n}\n\nfragment StandardArticle_standard on CodeStandard {\n  uri\n  name\n  description\n  categories(first: 8) {\n    edges {\n      node {\n        id\n        slug\n      }\n    }\n  }\n  extends(first: 8) {\n    edges {\n      node {\n        id\n        uri\n        name\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "8f5306d6f87a783ff7b921bb6c3eb1ad";

export default node;
