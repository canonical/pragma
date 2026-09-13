/**
 * @generated SignedSource<<156281808a9a7d64a117f9f0b89e280a>>
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
    readonly _meta: {
      readonly curie: string;
    };
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
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "curie",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "concreteType": "EntityMeta",
  "kind": "LinkedField",
  "name": "_meta",
  "plural": false,
  "selections": [
    (v5/*:: as any*/)
  ],
  "storageKey": null
},
v7 = [
  {
    "kind": "Variable",
    "name": "count",
    "variableName": "count"
  }
],
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "summary",
  "storageKey": null
},
v9 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
],
v10 = [
  (v4/*:: as any*/),
  (v6/*:: as any*/),
  (v3/*:: as any*/)
],
v11 = {
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
v12 = [
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
          (v6/*:: as any*/),
          (v3/*:: as any*/)
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  (v11/*:: as any*/)
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
          (v6/*:: as any*/),
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
            "args": (v7/*:: as any*/),
            "kind": "FragmentSpread",
            "name": "RelationsSection_component"
          },
          {
            "args": (v7/*:: as any*/),
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
          {
            "alias": null,
            "args": null,
            "concreteType": "EntityMeta",
            "kind": "LinkedField",
            "name": "_meta",
            "plural": false,
            "selections": [
              (v5/*:: as any*/),
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
          (v8/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Tier",
            "kind": "LinkedField",
            "name": "tier",
            "plural": false,
            "selections": [
              (v4/*:: as any*/),
              (v3/*:: as any*/),
              (v6/*:: as any*/)
            ],
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
              (v8/*:: as any*/)
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v9/*:: as any*/),
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
                    "selections": (v10/*:: as any*/),
                    "storageKey": null
                  }
                ],
                "storageKey": null
              },
              (v11/*:: as any*/)
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v9/*:: as any*/),
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
                    "selections": (v10/*:: as any*/),
                    "storageKey": null
                  }
                ],
                "storageKey": null
              },
              (v11/*:: as any*/)
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v9/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "variants",
            "plural": false,
            "selections": (v12/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v9/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "variantOfs",
            "plural": false,
            "selections": (v12/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v9/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "inheritsFroms",
            "plural": false,
            "selections": (v12/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v9/*:: as any*/),
            "concreteType": "UIBlockConnection",
            "kind": "LinkedField",
            "name": "specializedBies",
            "plural": false,
            "selections": (v12/*:: as any*/),
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
    "cacheID": "6959de046b9f35d5621815163da26fd2",
    "id": null,
    "metadata": {},
    "name": "ComponentEntityQuery",
    "operationKind": "query",
    "text": "query ComponentEntityQuery(\n  $uri: String!\n  $count: Int!\n) {\n  component(uri: $uri) {\n    name\n    uri\n    _meta {\n      curie\n    }\n    ...EntityHeader_component\n    ...PropertiesSection_component\n    ...RelationsSection_component_yu5n1\n    ...NeighbourhoodWell_component_yu5n1\n    ...EntityAside_component\n  }\n}\n\nfragment EntityAside_component on Component {\n  uri\n  _meta {\n    curie\n  }\n  version\n  tier {\n    uri\n    name\n    _meta {\n      curie\n    }\n  }\n}\n\nfragment EntityHeader_component on Component {\n  uri\n  _meta {\n    curie\n  }\n  name\n  summary\n  tier {\n    uri\n    name\n    _meta {\n      curie\n    }\n  }\n}\n\nfragment NeighbourhoodWell_component_yu5n1 on Component {\n  uri\n  name\n  _meta {\n    curie\n    type {\n      uri\n      label\n      namespace\n    }\n  }\n  tier {\n    uri\n    name\n    _meta {\n      curie\n    }\n  }\n  subcomponents(first: $count) {\n    edges {\n      node {\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  variants(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  variantOfs(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  inheritsFroms(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  specializedBies(first: $count) {\n    edges {\n      node {\n        __typename\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n  modifierFamilies(first: $count) {\n    edges {\n      node {\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n}\n\nfragment PropertiesSection_component on Component {\n  properties {\n    name\n    propertyType\n    optional\n    defaultValue\n    constraints\n    summary\n  }\n}\n\nfragment RelationsSection_component_yu5n1 on Component {\n  subcomponents(first: $count) {\n    edges {\n      node {\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n  }\n  modifierFamilies(first: $count) {\n    edges {\n      node {\n        uri\n        _meta {\n          curie\n        }\n        name\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "9c28ff6250037c0e46724f40b8792338";

export default node;
