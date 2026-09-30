/**
 * @generated SignedSource<<c8b507452816f0fe98d5ec071c0c7245>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type StandardsIndex_query$data = {
  readonly ontologyClass: {
    readonly instances: {
      readonly edges: ReadonlyArray<{
        readonly node: {
          readonly _meta: {
            readonly curie: string;
            readonly title: string;
            readonly type: {
              readonly _meta: {
                readonly title: string;
              };
              readonly uri: string;
            };
          };
          readonly uri: string;
        };
      }>;
    };
    readonly uri: string;
  } | null | undefined;
  readonly " $fragmentType": "StandardsIndex_query";
};
export type StandardsIndex_query$key = {
  readonly " $data"?: StandardsIndex_query$data;
  readonly " $fragmentSpreads": FragmentRefs<"StandardsIndex_query">;
};

import StandardsIndexPaginationQuery_graphql from './StandardsIndexPaginationQuery.graphql';

const node: ReaderFragment = (function(){
var v0 = [
  "ontologyClass",
  "instances"
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "uri",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "title",
  "storageKey": null
};
return {
  "argumentDefinitions": [
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "classUri"
    },
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "count"
    },
    {
      "defaultValue": null,
      "kind": "LocalArgument",
      "name": "cursor"
    }
  ],
  "kind": "Fragment",
  "metadata": {
    "connection": [
      {
        "count": "count",
        "cursor": "cursor",
        "direction": "forward",
        "path": (v0/*:: as any*/)
      }
    ],
    "refetch": {
      "connection": {
        "forward": {
          "count": "count",
          "cursor": "cursor"
        },
        "backward": null,
        "path": (v0/*:: as any*/)
      },
      "fragmentPathInResult": [],
      "operation": StandardsIndexPaginationQuery_graphql
    }
  },
  "name": "StandardsIndex_query",
  "selections": [
    {
      "alias": null,
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
        (v1/*:: as any*/),
        {
          "alias": "instances",
          "args": null,
          "concreteType": "NodeConnection",
          "kind": "LinkedField",
          "name": "__StandardsIndex_instances_connection",
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
                    (v1/*:: as any*/),
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
                          "kind": "ScalarField",
                          "name": "curie",
                          "storageKey": null
                        },
                        (v2/*:: as any*/),
                        {
                          "alias": null,
                          "args": null,
                          "concreteType": "OntologyClass",
                          "kind": "LinkedField",
                          "name": "type",
                          "plural": false,
                          "selections": [
                            (v1/*:: as any*/),
                            {
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
                      "name": "__typename",
                      "storageKey": null
                    }
                  ],
                  "storageKey": null
                },
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "cursor",
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
                  "name": "endCursor",
                  "storageKey": null
                },
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
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Query",
  "abstractKey": null
};
})();

(node as any).hash = "494d460b165999637376e6e2aaf2d99a";

export default node;
