/**
 * @generated SignedSource<<4a689be371d23a43faa26b2d8094c1de>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type PropertyKind = "ANNOTATION" | "DATATYPE" | "OBJECT" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type TermInspector_class$data = {
  readonly definition: string | null | undefined;
  readonly instanceCount: number;
  readonly instances: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly __typename: string;
        readonly id: string;
        readonly name?: string | null | undefined;
        readonly uri: string;
      };
    }>;
    readonly pageInfo: {
      readonly hasNextPage: boolean;
    };
  };
  readonly isAbstract: boolean;
  readonly label: string | null | undefined;
  readonly namespace: string;
  readonly properties: ReadonlyArray<{
    readonly inherited: boolean;
    readonly property: {
      readonly definition: string | null | undefined;
      readonly kind: PropertyKind;
      readonly label: string | null | undefined;
      readonly range: string;
      readonly uri: string;
    };
    readonly required: boolean;
    readonly singular: boolean;
  }>;
  readonly subclasses: ReadonlyArray<{
    readonly label: string | null | undefined;
    readonly uri: string;
  }>;
  readonly superclass: {
    readonly label: string | null | undefined;
    readonly uri: string;
  } | null | undefined;
  readonly superclasses: ReadonlyArray<{
    readonly label: string | null | undefined;
    readonly uri: string;
  }>;
  readonly uri: string;
  readonly " $fragmentType": "TermInspector_class";
};
export type TermInspector_class$key = {
  readonly " $data"?: TermInspector_class$data;
  readonly " $fragmentSpreads": FragmentRefs<"TermInspector_class">;
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
  "name": "label",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "definition",
  "storageKey": null
},
v3 = [
  (v0/*:: as any*/),
  (v1/*:: as any*/)
];
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "TermInspector_class",
  "selections": [
    (v0/*:: as any*/),
    (v1/*:: as any*/),
    (v2/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isAbstract",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "namespace",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "instanceCount",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "OntologyClass",
      "kind": "LinkedField",
      "name": "superclass",
      "plural": false,
      "selections": (v3/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "OntologyClass",
      "kind": "LinkedField",
      "name": "superclasses",
      "plural": true,
      "selections": (v3/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "OntologyClass",
      "kind": "LinkedField",
      "name": "subclasses",
      "plural": true,
      "selections": (v3/*:: as any*/),
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "ClassProperty",
      "kind": "LinkedField",
      "name": "properties",
      "plural": true,
      "selections": [
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "required",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "singular",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "inherited",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "concreteType": "OntologyProperty",
          "kind": "LinkedField",
          "name": "property",
          "plural": false,
          "selections": [
            (v0/*:: as any*/),
            (v1/*:: as any*/),
            (v2/*:: as any*/),
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "range",
              "storageKey": null
            },
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "kind",
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
      "args": [
        {
          "kind": "Literal",
          "name": "first",
          "value": 12
        }
      ],
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
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "id",
                  "storageKey": null
                },
                (v0/*:: as any*/),
                {
                  "kind": "InlineFragment",
                  "selections": [
                    {
                      "alias": null,
                      "args": null,
                      "kind": "ScalarField",
                      "name": "name",
                      "storageKey": null
                    }
                  ],
                  "type": "Entity",
                  "abstractKey": "__isEntity"
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
        }
      ],
      "storageKey": "instances(first:12)"
    }
  ],
  "type": "OntologyClass",
  "abstractKey": null
};
})();

(node as any).hash = "17130f864473950f134bef4d9f78d94b";

export default node;
