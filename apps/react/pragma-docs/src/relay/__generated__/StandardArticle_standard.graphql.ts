/**
 * @generated SignedSource<<f98267a494a4489dfa53a7c4a10548eb>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type StandardArticle_standard$data = {
  readonly categories: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly id: string;
        readonly slug: string | null | undefined;
      };
    }>;
  };
  readonly description: string | null | undefined;
  readonly extends: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly id: string;
        readonly name: string | null | undefined;
        readonly uri: string;
      };
    }>;
  };
  readonly name: string | null | undefined;
  readonly uri: string;
  readonly " $fragmentType": "StandardArticle_standard";
};
export type StandardArticle_standard$key = {
  readonly " $data"?: StandardArticle_standard$data;
  readonly " $fragmentSpreads": FragmentRefs<"StandardArticle_standard">;
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
v2 = [
  {
    "kind": "Literal",
    "name": "first",
    "value": 8
  }
],
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
};
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "StandardArticle_standard",
  "selections": [
    (v0/*:: as any*/),
    (v1/*:: as any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "description",
      "storageKey": null
    },
    {
      "alias": null,
      "args": (v2/*:: as any*/),
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
      "args": (v2/*:: as any*/),
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
                (v0/*:: as any*/),
                (v1/*:: as any*/)
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
  "type": "CodeStandard",
  "abstractKey": null
};
})();

(node as any).hash = "a655b01daf31deb5359ca52be04e96a8";

export default node;
