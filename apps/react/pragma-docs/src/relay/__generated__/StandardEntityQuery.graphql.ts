/**
 * @generated SignedSource<<f7bdf29512962ca0afbd7b61325e441a>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type StandardEntityQuery$variables = {
  classUri: string;
  uri: string;
};
export type StandardEntityQuery$data = {
  readonly boundClass: {
    readonly subclasses: ReadonlyArray<{
      readonly uri: string;
    }>;
    readonly uri: string;
  } | null | undefined;
  readonly node: {
    readonly _meta: {
      readonly curie: string;
      readonly title: string;
      readonly type: {
        readonly uri: string;
      };
    };
    readonly uri: string;
    readonly " $fragmentSpreads": FragmentRefs<"StandardArticle_standard">;
  } | null | undefined;
};
export type StandardEntityQuery = {
  response: StandardEntityQuery$data;
  variables: StandardEntityQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "classUri"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "uri"
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v3 = [
  (v2/*:: as any*/)
],
v4 = {
  "alias": "boundClass",
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
    (v2/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "concreteType": "OntologyClass",
      "kind": "LinkedField",
      "name": "subclasses",
      "plural": true,
      "selections": (v3/*:: as any*/),
      "storageKey": null
    }
  ],
  "storageKey": null
},
v5 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "uri"
  }
],
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "curie",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "title",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "StandardEntityQuery",
    "selections": [
      (v4/*:: as any*/),
      {
        "alias": null,
        "args": (v5/*:: as any*/),
        "concreteType": null,
        "kind": "LinkedField",
        "name": "node",
        "plural": false,
        "selections": [
          (v2/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "EntityMeta",
            "kind": "LinkedField",
            "name": "_meta",
            "plural": false,
            "selections": [
              (v6/*:: as any*/),
              (v7/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "type",
                "plural": false,
                "selections": (v3/*:: as any*/),
                "storageKey": null
              }
            ],
            "storageKey": null
          },
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
    "argumentDefinitions": [
      (v1/*:: as any*/),
      (v0/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "StandardEntityQuery",
    "selections": [
      (v4/*:: as any*/),
      {
        "alias": null,
        "args": (v5/*:: as any*/),
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
          (v2/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "EntityMeta",
            "kind": "LinkedField",
            "name": "_meta",
            "plural": false,
            "selections": [
              (v6/*:: as any*/),
              (v7/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "type",
                "plural": false,
                "selections": [
                  (v2/*:: as any*/),
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "EntityMeta",
                    "kind": "LinkedField",
                    "name": "_meta",
                    "plural": false,
                    "selections": [
                      (v7/*:: as any*/)
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
                "name": "definition",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "kind": "TypeDiscriminator",
            "abstractKey": "__isNode"
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "43a7380349c9067f2485a88cebfc5d5e",
    "id": null,
    "metadata": {},
    "name": "StandardEntityQuery",
    "operationKind": "query",
    "text": "query StandardEntityQuery(\n  $uri: ID!\n  $classUri: String!\n) {\n  boundClass: ontologyClass(uri: $classUri) {\n    uri\n    subclasses {\n      uri\n    }\n  }\n  node(id: $uri) {\n    __typename\n    uri\n    _meta {\n      curie\n      title\n      type {\n        uri\n      }\n    }\n    ...StandardArticle_standard\n  }\n}\n\nfragment StandardArticle_standard on Node {\n  __isNode: __typename\n  uri\n  _meta {\n    curie\n    title\n    definition\n    type {\n      uri\n      _meta {\n        title\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "4a7f5cf8f14a23d80addd18f4d9097e7";

export default node;
