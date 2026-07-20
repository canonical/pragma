/**
 * @generated SignedSource<<54e9d5c9ae8a4a2df9e835b4b1eeee8f>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type DefinitionsExplorerQuery$variables = {
  hasTerm: boolean;
  uri: string;
};
export type DefinitionsExplorerQuery$data = {
  readonly ontologies: ReadonlyArray<{
    readonly classes: ReadonlyArray<{
      readonly isAbstract: boolean;
      readonly uri: string;
    }>;
    readonly namespace: string;
    readonly prefix: string;
    readonly " $fragmentSpreads": FragmentRefs<"HierarchyWell_ontologies" | "TermRail_ontologies">;
  }>;
  readonly ontologyClass?: {
    readonly " $fragmentSpreads": FragmentRefs<"TermInspector_class">;
  } | null | undefined;
  readonly ontologyProperty?: {
    readonly " $fragmentSpreads": FragmentRefs<"TermInspector_property">;
  } | null | undefined;
};
export type DefinitionsExplorerQuery = {
  response: DefinitionsExplorerQuery$data;
  variables: DefinitionsExplorerQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "hasTerm"
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
  "name": "prefix",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "namespace",
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
  "name": "isAbstract",
  "storageKey": null
},
v6 = [
  {
    "kind": "Variable",
    "name": "uri",
    "variableName": "uri"
  }
],
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "label",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "instanceCount",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "kind",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "definition",
  "storageKey": null
},
v11 = [
  (v4/*:: as any*/),
  (v7/*:: as any*/)
],
v12 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "range",
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
    "name": "DefinitionsExplorerQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Ontology",
        "kind": "LinkedField",
        "name": "ontologies",
        "plural": true,
        "selections": [
          (v2/*:: as any*/),
          (v3/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "OntologyClass",
            "kind": "LinkedField",
            "name": "classes",
            "plural": true,
            "selections": [
              (v4/*:: as any*/),
              (v5/*:: as any*/)
            ],
            "storageKey": null
          },
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "TermRail_ontologies"
          },
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "HierarchyWell_ontologies"
          }
        ],
        "storageKey": null
      },
      {
        "condition": "hasTerm",
        "kind": "Condition",
        "passingValue": true,
        "selections": [
          {
            "alias": null,
            "args": (v6/*:: as any*/),
            "concreteType": "OntologyClass",
            "kind": "LinkedField",
            "name": "ontologyClass",
            "plural": false,
            "selections": [
              {
                "args": null,
                "kind": "FragmentSpread",
                "name": "TermInspector_class"
              }
            ],
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v6/*:: as any*/),
            "concreteType": "OntologyProperty",
            "kind": "LinkedField",
            "name": "ontologyProperty",
            "plural": false,
            "selections": [
              {
                "args": null,
                "kind": "FragmentSpread",
                "name": "TermInspector_property"
              }
            ],
            "storageKey": null
          }
        ]
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
    "name": "DefinitionsExplorerQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Ontology",
        "kind": "LinkedField",
        "name": "ontologies",
        "plural": true,
        "selections": [
          (v2/*:: as any*/),
          (v3/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "OntologyClass",
            "kind": "LinkedField",
            "name": "classes",
            "plural": true,
            "selections": [
              (v4/*:: as any*/),
              (v5/*:: as any*/),
              (v7/*:: as any*/),
              (v8/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "superclass",
                "plural": false,
                "selections": [
                  (v4/*:: as any*/)
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          (v7/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "OntologyProperty",
            "kind": "LinkedField",
            "name": "properties",
            "plural": true,
            "selections": [
              (v4/*:: as any*/),
              (v7/*:: as any*/),
              (v9/*:: as any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "condition": "hasTerm",
        "kind": "Condition",
        "passingValue": true,
        "selections": [
          {
            "alias": null,
            "args": (v6/*:: as any*/),
            "concreteType": "OntologyClass",
            "kind": "LinkedField",
            "name": "ontologyClass",
            "plural": false,
            "selections": [
              (v4/*:: as any*/),
              (v7/*:: as any*/),
              (v10/*:: as any*/),
              (v5/*:: as any*/),
              (v3/*:: as any*/),
              (v8/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "superclass",
                "plural": false,
                "selections": (v11/*:: as any*/),
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "superclasses",
                "plural": true,
                "selections": (v11/*:: as any*/),
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "subclasses",
                "plural": true,
                "selections": (v11/*:: as any*/),
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
                      (v4/*:: as any*/),
                      (v7/*:: as any*/),
                      (v10/*:: as any*/),
                      (v12/*:: as any*/),
                      (v9/*:: as any*/)
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
                          (v4/*:: as any*/),
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
            "storageKey": null
          },
          {
            "alias": null,
            "args": (v6/*:: as any*/),
            "concreteType": "OntologyProperty",
            "kind": "LinkedField",
            "name": "ontologyProperty",
            "plural": false,
            "selections": [
              (v4/*:: as any*/),
              (v7/*:: as any*/),
              (v10/*:: as any*/),
              (v9/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "functional",
                "storageKey": null
              },
              (v12/*:: as any*/),
              (v3/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyClass",
                "kind": "LinkedField",
                "name": "domain",
                "plural": false,
                "selections": (v11/*:: as any*/),
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "OntologyProperty",
                "kind": "LinkedField",
                "name": "inverse",
                "plural": false,
                "selections": (v11/*:: as any*/),
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "acceptanceCriteria",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "completionGuidance",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ]
      }
    ]
  },
  "params": {
    "cacheID": "15dd25d2dece9931b5e8ab81691e4c1d",
    "id": null,
    "metadata": {},
    "name": "DefinitionsExplorerQuery",
    "operationKind": "query",
    "text": "query DefinitionsExplorerQuery(\n  $uri: String!\n  $hasTerm: Boolean!\n) {\n  ontologies {\n    prefix\n    namespace\n    classes {\n      uri\n      isAbstract\n    }\n    ...TermRail_ontologies\n    ...HierarchyWell_ontologies\n  }\n  ontologyClass(uri: $uri) @include(if: $hasTerm) {\n    ...TermInspector_class\n  }\n  ontologyProperty(uri: $uri) @include(if: $hasTerm) {\n    ...TermInspector_property\n  }\n}\n\nfragment HierarchyWell_ontologies on Ontology {\n  prefix\n  namespace\n  classes {\n    uri\n    label\n    isAbstract\n    superclass {\n      uri\n    }\n  }\n}\n\nfragment TermInspector_class on OntologyClass {\n  uri\n  label\n  definition\n  isAbstract\n  namespace\n  instanceCount\n  superclass {\n    uri\n    label\n  }\n  superclasses {\n    uri\n    label\n  }\n  subclasses {\n    uri\n    label\n  }\n  properties {\n    required\n    singular\n    inherited\n    property {\n      uri\n      label\n      definition\n      range\n      kind\n    }\n  }\n  instances(first: 12) {\n    edges {\n      node {\n        __typename\n        id\n        uri\n        ... on Entity {\n          __isEntity: __typename\n          name\n        }\n      }\n    }\n    pageInfo {\n      hasNextPage\n    }\n  }\n}\n\nfragment TermInspector_property on OntologyProperty {\n  uri\n  label\n  definition\n  kind\n  functional\n  range\n  namespace\n  domain {\n    uri\n    label\n  }\n  inverse {\n    uri\n    label\n  }\n  acceptanceCriteria\n  completionGuidance\n}\n\nfragment TermRail_ontologies on Ontology {\n  prefix\n  label\n  namespace\n  classes {\n    uri\n    label\n    isAbstract\n    instanceCount\n  }\n  properties {\n    uri\n    label\n    kind\n  }\n}\n"
  }
};
})();

(node as any).hash = "837f3a8e48716b8863c7d3bcb3cdf273";

export default node;
