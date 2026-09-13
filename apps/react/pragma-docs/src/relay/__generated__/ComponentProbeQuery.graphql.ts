/**
 * @generated SignedSource<<c79206d54e0a3ef60a8bd61b3ec82dfb>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ComponentProbeQuery$variables = {
  count: number;
  uri: string;
};
export type ComponentProbeQuery$data = {
  readonly component: {
    readonly _meta: {
      readonly curie: string;
    };
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
    readonly name: string | null | undefined;
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
    readonly summary: string | null | undefined;
    readonly tier: {
      readonly name: string | null | undefined;
      readonly uri: string;
    } | null | undefined;
    readonly uri: string;
  } | null | undefined;
};
export type ComponentProbeQuery = {
  response: ComponentProbeQuery$data;
  variables: ComponentProbeQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "count"
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
v3 = {
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
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v5 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
],
v6 = [
  (v2/*:: as any*/),
  (v3/*:: as any*/),
  (v4/*:: as any*/)
],
v7 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "uri",
        "variableName": "uri"
      }
    ],
    "concreteType": "Component",
    "kind": "LinkedField",
    "name": "component",
    "plural": false,
    "selections": [
      (v2/*:: as any*/),
      (v3/*:: as any*/),
      (v4/*:: as any*/),
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
        "concreteType": "Tier",
        "kind": "LinkedField",
        "name": "tier",
        "plural": false,
        "selections": [
          (v2/*:: as any*/),
          (v4/*:: as any*/)
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": (v5/*:: as any*/),
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
                "selections": (v6/*:: as any*/),
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
        "args": (v5/*:: as any*/),
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
                "selections": (v6/*:: as any*/),
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
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "ComponentProbeQuery",
    "selections": (v7/*:: as any*/),
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
    "name": "ComponentProbeQuery",
    "selections": (v7/*:: as any*/)
  },
  "params": {
    "cacheID": "912a80fe5fc6ba574fc80daf4a612761",
    "id": null,
    "metadata": {},
    "name": "ComponentProbeQuery",
    "operationKind": "query",
    "text": "query ComponentProbeQuery(\n  $uri: String!\n  $count: Int!\n) {\n  component(uri: $uri) {\n    uri\n    _meta {\n      curie\n    }\n    name\n    summary\n    tier {\n      uri\n      name\n    }\n    subcomponents(first: $count) {\n      edges {\n        node {\n          uri\n          _meta {\n            curie\n          }\n          name\n        }\n      }\n    }\n    modifierFamilies(first: $count) {\n      edges {\n        node {\n          uri\n          _meta {\n            curie\n          }\n          name\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "2fbbaa447bfa8c04f6a8eb43acfc7418";

export default node;
