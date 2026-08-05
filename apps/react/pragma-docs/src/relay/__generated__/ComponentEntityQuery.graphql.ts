/**
 * @generated SignedSource<<caa90dc0294d7a5dcfb51360075c7358>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ComponentEntityQuery$variables = {
  count: number;
  uri: string;
};
export type ComponentEntityQuery$data = {
  readonly component: {
    readonly name: string | null | undefined;
    readonly uri: string;
    readonly " $fragmentSpreads": FragmentRefs<"EntityAside_component" | "EntityHeader_component" | "NeighbourhoodWell_component" | "PropertiesSection_component" | "RelationsSection_component">;
  } | null | undefined;
};
export type ComponentEntityQuery = {
  response: ComponentEntityQuery$data;
  variables: ComponentEntityQuery$variables;
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
v2 = [
  {
    "kind": "Variable",
    "name": "uri",
    "variableName": "uri"
  }
],
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
    "kind": "Variable",
    "name": "count",
    "variableName": "count"
  }
],
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "summary",
  "storageKey": null
},
v7 = [
  (v4/*:: as any*/),
  (v3/*:: as any*/)
],
v8 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
],
v9 = {
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
      "name": "hasNextPage",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v10 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "UIBlockEdge",
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
          (v4/*:: as any*/),
          (v3/*:: as any*/)
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  (v9/*:: as any*/)
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*:: as any*/),
      (v1/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "ComponentEntityQuery",
    "selections": [
      {
        "alias": null,
        "args": (v2/*:: as any*/),
        "concreteType": "Component",
        "kind": "LinkedField",
        "name": "component",
        "plural": false,
        "selections": [
          (v3/*:: as any*/),
          (v4/*:: as any*/),
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "EntityHeader_component"
          },
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "PropertiesSection_component"
          },
          {
            "args": (v5/*:: as any*/),
            "kind": "FragmentSpread",
            "name": "RelationsSection_component"
          },
          {
            "args": (v5/*:: as any*/),
            "kind": "FragmentSpread",
            "name": "NeighbourhoodWell_component"
          },
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "EntityAside_component"
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
    "name": "ComponentEntityQuery",
    "selections": [
      {
        "alias": null,
        "args": (v2/*:: as any*/),
        "concreteType": "Component",
        "kind": "LinkedField",
        "name": "component",
        "plural": false,
        "selections": [
          (v3/*:: as any*/),
          (v4/*:: as any*/),
          (v6/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Tier",
            "kind": "LinkedField",
            "name": "tier",
            "plural": false,
            "selections": (v7/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Property",
            "kind": "LinkedField",
            "name": "properties",
            "plural": true,
            "selections": [
              (v3/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "propertyType",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "optional",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "defaultValue",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "constraints",
                "storageKey": null
              },
              (v6/*:: as any*/)
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v8/*:: as any*/),
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
                    "selections": (v7/*:: as any*/),
                    "storageKey": null
                  }
                ],
                "storageKey": null
              },
              (v9/*:: as any*/)
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v8/*:: as any*/),
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
                    "selections": (v7/*:: as any*/),
                    "storageKey": null
                  }
                ],
                "storageKey": null
              },
              (v9/*:: as any*/)
            ],
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
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "type",
                "plural": false,
                "selections": [
                  (v4/*:: as any*/),
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "label",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "namespace",
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
            "args": (v8/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "variants",
            "plural": false,
            "selections": (v10/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v8/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "variantOfs",
            "plural": false,
            "selections": (v10/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v8/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "inheritsFroms",
            "plural": false,
            "selections": (v10/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v8/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "specializedBies",
            "plural": false,
            "selections": (v10/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "version",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "24c19bbe938e338db2ea232d853a4b04",
    "id": null,
    "metadata": {},
    "name": "ComponentEntityQuery",
    "operationKind": "query",
    "text": "query ComponentEntityQuery(\n  $uri: String!\n  $count: Int!\n) {\n  component(uri: $uri) {\n    name\n    uri\n    ...EntityHeader_component\n    ...PropertiesSection_component\n    ...RelationsSection_component_yu5n1\n    ...NeighbourhoodWell_component_yu5n1\n    ...EntityAside_component\n  }\n}\n\nfragment EntityAside_component on Component {\n  uri\n  version\n  tier {\n    uri\n    name\n  }\n}\n\nfragment EntityHeader_component on Component {\n  uri\n  name\n  summary\n  tier {\n    uri\n    name\n  }\n}\n\nfragment NeighbourhoodWell_component_yu5n1 on Component {\n  uri\n  name\n  _meta {\n    type {\n      uri\n      label\n      namespace\n    }\n  }\n  tier {\n    uri\n    name\n  }\n  subcomponents(first: $count) {\n    edges {\n      node {\n        uri\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  variants(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  variantOfs(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  inheritsFroms(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  specializedBies(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  modifierFamilies(first: $count) {\n    edges {\n      node {\n        uri\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n}\n\nfragment PropertiesSection_component on Component {\n  properties {\n    name\n    propertyType\n    optional\n    defaultValue\n    constraints\n    summary\n  }\n}\n\nfragment RelationsSection_component_yu5n1 on Component {\n  subcomponents(first: $count) {\n    edges {\n      node {\n        uri\n        name\n      }\n    }\n  }\n  modifierFamilies(first: $count) {\n    edges {\n      node {\n        uri\n        name\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "aba2cc8367812cb8948bae035ccfb3c0";

export default node;
