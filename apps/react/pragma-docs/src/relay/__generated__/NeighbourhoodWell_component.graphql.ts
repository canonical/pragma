/**
 * @generated SignedSource<<77b4c2b0d8a818f0a3d2789620f96b1d>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type NeighbourhoodWell_component$data = {
  readonly _meta: {
    readonly curie: string;
    readonly type: {
      readonly label: string | null | undefined;
      readonly namespace: string;
      readonly uri: string;
    };
  };
  readonly inheritsFroms: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly _meta: {
          readonly curie: string;
        };
        readonly name: string | null | undefined;
        readonly uri: string;
      };
    }>;
    readonly pageInfo: {
      readonly hasNextPage: boolean;
    };
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
    readonly pageInfo: {
      readonly hasNextPage: boolean;
    };
  };
  readonly name: string | null | undefined;
  readonly specializedBies: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly _meta: {
          readonly curie: string;
        };
        readonly name: string | null | undefined;
        readonly uri: string;
      };
    }>;
    readonly pageInfo: {
      readonly hasNextPage: boolean;
    };
  };
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
    readonly pageInfo: {
      readonly hasNextPage: boolean;
    };
  };
  readonly tier: {
    readonly _meta: {
      readonly curie: string;
    };
    readonly name: string | null | undefined;
    readonly uri: string;
  } | null | undefined;
  readonly uri: string;
  readonly variantOfs: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly _meta: {
          readonly curie: string;
        };
        readonly name: string | null | undefined;
        readonly uri: string;
      };
    }>;
    readonly pageInfo: {
      readonly hasNextPage: boolean;
    };
  };
  readonly variants: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly _meta: {
          readonly curie: string;
        };
        readonly name: string | null | undefined;
        readonly uri: string;
      };
    }>;
    readonly pageInfo: {
      readonly hasNextPage: boolean;
    };
  };
  readonly " $fragmentType": "NeighbourhoodWell_component";
};
export type NeighbourhoodWell_component$key = {
  readonly " $data"?: NeighbourhoodWell_component$data;
  readonly " $fragmentSpreads": FragmentRefs<"NeighbourhoodWell_component">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "curie",
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
    (v2/*:: as any*/)
  ],
  "storageKey": null
},
v4 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "count"
  }
],
v5 = [
  (v0/*:: as any*/),
  (v3/*:: as any*/),
  (v1/*:: as any*/)
],
v6 = {
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
v7 = [
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
        "selections": (v5/*:: as any*/),
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  (v6/*:: as any*/)
];
return {
  "argumentDefinitions": [
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "count"
    }
  ],
  "kind": "Fragment",
  "metadata": null,
  "name": "NeighbourhoodWell_component",
  "selections": [
    (v0/*:: as any*/),
    (v1/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "concreteType": "EntityMeta",
      "kind": "LinkedField",
      "name": "_meta",
      "plural": false,
      "selections": [
        (v2/*:: as any*/),
        {
          "alias": null,
          "args": null,
          "concreteType": "OntologyClass",
          "kind": "LinkedField",
          "name": "type",
          "plural": false,
          "selections": [
            (v0/*:: as any*/),
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
      "args": null,
      "concreteType": "Tier",
      "kind": "LinkedField",
      "name": "tier",
      "plural": false,
      "selections": [
        (v0/*:: as any*/),
        (v1/*:: as any*/),
        (v3/*:: as any*/)
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v4/*:: as any*/),
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
              "selections": (v5/*:: as any*/),
              "storageKey": null
            }
          ],
          "storageKey": null
        },
        (v6/*:: as any*/)
      ],
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v4/*:: as any*/),
      "concreteType": "UIBlockConnection",
      "kind": "LinkedField",
      "name": "variants",
      "plural": false,
      "selections": (v7/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v4/*:: as any*/),
      "concreteType": "UIBlockConnection",
      "kind": "LinkedField",
      "name": "variantOfs",
      "plural": false,
      "selections": (v7/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v4/*:: as any*/),
      "concreteType": "UIBlockConnection",
      "kind": "LinkedField",
      "name": "inheritsFroms",
      "plural": false,
      "selections": (v7/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v4/*:: as any*/),
      "concreteType": "UIBlockConnection",
      "kind": "LinkedField",
      "name": "specializedBies",
      "plural": false,
      "selections": (v7/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v4/*:: as any*/),
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
              "selections": (v5/*:: as any*/),
              "storageKey": null
            }
          ],
          "storageKey": null
        },
        (v6/*:: as any*/)
      ],
      "storageKey": null
    }
  ],
  "type": "Component",
  "abstractKey": null
};
})();

(node as any).hash = "2abe310b3fcb11b83b39d2a69b52e608";

export default node;
