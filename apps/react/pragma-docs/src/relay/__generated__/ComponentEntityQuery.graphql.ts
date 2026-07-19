/**
 * @generated SignedSource<<7e7e2004dd5cea3d02c13b619066d996>>
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
    readonly id: string;
    readonly name: string | null | undefined;
    readonly uri: string;
    readonly " $fragmentSpreads": FragmentRefs<"EntityAside_component" | "EntityHeader_component" | "PropertiesSection_component" | "RelationsSection_component">;
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
  "name": "id",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "summary",
  "storageKey": null
},
v7 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
],
v8 = [
  (v3/*:: as any*/),
  (v5/*:: as any*/),
  (v4/*:: as any*/)
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
          (v5/*:: as any*/),
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
            "args": [
              {
                "kind": "Variable",
                "name": "count",
                "variableName": "count"
              }
            ],
            "kind": "FragmentSpread",
            "name": "RelationsSection_component"
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
          (v5/*:: as any*/),
          (v6/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Tier",
            "kind": "LinkedField",
            "name": "tier",
            "plural": false,
            "selections": [
              (v3/*:: as any*/),
              (v4/*:: as any*/)
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
              (v4/*:: as any*/),
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
            "args": (v7/*:: as any*/),
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
                    "selections": (v8/*:: as any*/),
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
            "args": (v7/*:: as any*/),
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
                    "selections": (v8/*:: as any*/),
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
            "name": "version",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "1c7e8b06c40cdd56c163f45c1b0b4585",
    "id": null,
    "metadata": {},
    "name": "ComponentEntityQuery",
    "operationKind": "query",
    "text": "query ComponentEntityQuery(\n  $uri: String!\n  $count: Int!\n) {\n  component(uri: $uri) {\n    id\n    name\n    uri\n    ...EntityHeader_component\n    ...PropertiesSection_component\n    ...RelationsSection_component_yu5n1\n    ...EntityAside_component\n  }\n}\n\nfragment EntityAside_component on Component {\n  uri\n  version\n  tier {\n    id\n    name\n  }\n}\n\nfragment EntityHeader_component on Component {\n  uri\n  name\n  summary\n  tier {\n    id\n    name\n  }\n}\n\nfragment PropertiesSection_component on Component {\n  properties {\n    name\n    propertyType\n    optional\n    defaultValue\n    constraints\n    summary\n  }\n}\n\nfragment RelationsSection_component_yu5n1 on Component {\n  subcomponents(first: $count) {\n    edges {\n      node {\n        id\n        uri\n        name\n      }\n    }\n  }\n  modifierFamilies(first: $count) {\n    edges {\n      node {\n        id\n        uri\n        name\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "6681b7b565c62f3c83667f4eb1a2b12e";

export default node;
