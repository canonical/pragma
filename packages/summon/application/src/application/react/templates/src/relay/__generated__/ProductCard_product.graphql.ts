/**
 * @generated SignedSource<<a6fcbf029d2f62fcf6f378581e4985a3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ProductCard_product$data = {
  readonly currency: string;
  readonly inStock: boolean;
  readonly name: string;
  readonly priceCents: number;
  readonly rating: number;
  readonly tagline: string;
  readonly " $fragmentType": "ProductCard_product";
};
export type ProductCard_product$key = {
  readonly " $data"?: ProductCard_product$data;
  readonly " $fragmentSpreads": FragmentRefs<"ProductCard_product">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "ProductCard_product",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "name",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "tagline",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "priceCents",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "currency",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "rating",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "inStock",
      "storageKey": null
    }
  ],
  "type": "Product",
  "abstractKey": null
};

(node as any).hash = "542f84e3fd8c5cc8222c4d637a9ee99d";

export default node;
