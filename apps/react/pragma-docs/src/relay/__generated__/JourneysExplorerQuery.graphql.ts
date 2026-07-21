/**
 * @generated SignedSource<<279bbc428339b9f827a73acba2a0f725>>
 * @lightSyntaxTransform
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type JourneysExplorerQuery$variables = {
  hasJob: boolean;
  jobs: number;
  pairings: number;
  uri: string;
};
export type JourneysExplorerQuery$data = {
  readonly head: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly arrivals: {
          readonly edges: ReadonlyArray<{
            readonly node: {
              readonly uri: string;
            };
          }>;
        };
        readonly forJob: {
          readonly uri: string;
        } | null | undefined;
        readonly pairingRole: {
          readonly uri: string;
        } | null | undefined;
        readonly pairsSurface: {
          readonly __typename: string;
          readonly composes: {
            readonly edges: ReadonlyArray<{
              readonly node: {
                readonly name: string | null | undefined;
                readonly uri: string;
              };
            }>;
          };
          readonly uri: string;
        } | null | undefined;
        readonly uri: string;
      };
    }>;
  };
  readonly job?: {
    readonly uri: string;
  } | null | undefined;
  readonly jobs: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly acceptances: ReadonlyArray<string>;
        readonly coordinates: {
          readonly actors: {
            readonly edges: ReadonlyArray<{
              readonly node: {
                readonly uri: string;
              };
            }>;
          };
          readonly fluencies: {
            readonly edges: ReadonlyArray<{
              readonly node: {
                readonly uri: string;
              };
            }>;
          };
          readonly roles: {
            readonly edges: ReadonlyArray<{
              readonly node: {
                readonly uri: string;
              };
            }>;
          };
          readonly uri: string;
        } | null | undefined;
        readonly story: string | null | undefined;
        readonly uri: string;
      };
    }>;
  };
  readonly personas: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly uri: string;
      };
    }>;
  };
  readonly tail: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly arrivals: {
          readonly edges: ReadonlyArray<{
            readonly node: {
              readonly uri: string;
            };
          }>;
        };
        readonly forJob: {
          readonly uri: string;
        } | null | undefined;
        readonly pairingRole: {
          readonly uri: string;
        } | null | undefined;
        readonly pairsSurface: {
          readonly __typename: string;
          readonly composes: {
            readonly edges: ReadonlyArray<{
              readonly node: {
                readonly name: string | null | undefined;
                readonly uri: string;
              };
            }>;
          };
          readonly uri: string;
        } | null | undefined;
        readonly uri: string;
      };
    }>;
  };
};
export type JourneysExplorerQuery = {
  response: JourneysExplorerQuery$data;
  variables: JourneysExplorerQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "hasJob"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "jobs"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "pairings"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "uri"
},
v4 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "jobs"
  }
],
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
  "name": "story",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "acceptances",
  "storageKey": null
},
v8 = [
  (v5/*:: as any*/)
],
v9 = [
  {
    "kind": "Variable",
    "name": "first",
    "variableName": "pairings"
  }
],
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "__typename",
  "storageKey": null
},
v11 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v12 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "PairingEdge",
    "kind": "LinkedField",
    "name": "edges",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Pairing",
        "kind": "LinkedField",
        "name": "node",
        "plural": false,
        "selections": [
          (v5/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "PairingRole",
            "kind": "LinkedField",
            "name": "pairingRole",
            "plural": false,
            "selections": (v8/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Job",
            "kind": "LinkedField",
            "name": "forJob",
            "plural": false,
            "selections": (v8/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "PreservationConnection",
            "kind": "LinkedField",
            "name": "arrivals",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "PreservationEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Preservation",
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
            "concreteType": null,
            "kind": "LinkedField",
            "name": "pairsSurface",
            "plural": false,
            "selections": [
              (v10/*:: as any*/),
              (v5/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "LayoutConnection",
                "kind": "LinkedField",
                "name": "composes",
                "plural": false,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "LayoutEdge",
                    "kind": "LinkedField",
                    "name": "edges",
                    "plural": true,
                    "selections": [
                      {
                        "alias": null,
                        "args": null,
                        "concreteType": "Layout",
                        "kind": "LinkedField",
                        "name": "node",
                        "plural": false,
                        "selections": [
                          (v5/*:: as any*/),
                          (v11/*:: as any*/)
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
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
],
v13 = [
  {
    "kind": "Variable",
    "name": "last",
    "variableName": "pairings"
  }
],
v14 = [
  {
    "kind": "Variable",
    "name": "uri",
    "variableName": "uri"
  }
],
v15 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v16 = [
  (v5/*:: as any*/),
  (v15/*:: as any*/)
],
v17 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "PairingEdge",
    "kind": "LinkedField",
    "name": "edges",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "Pairing",
        "kind": "LinkedField",
        "name": "node",
        "plural": false,
        "selections": [
          (v5/*:: as any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "PairingRole",
            "kind": "LinkedField",
            "name": "pairingRole",
            "plural": false,
            "selections": (v16/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "Job",
            "kind": "LinkedField",
            "name": "forJob",
            "plural": false,
            "selections": (v16/*:: as any*/),
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "PreservationConnection",
            "kind": "LinkedField",
            "name": "arrivals",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "PreservationEdge",
                "kind": "LinkedField",
                "name": "edges",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Preservation",
                    "kind": "LinkedField",
                    "name": "node",
                    "plural": false,
                    "selections": (v16/*:: as any*/),
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
            "concreteType": null,
            "kind": "LinkedField",
            "name": "pairsSurface",
            "plural": false,
            "selections": [
              (v10/*:: as any*/),
              (v5/*:: as any*/),
              {
                "alias": null,
                "args": null,
                "concreteType": "LayoutConnection",
                "kind": "LinkedField",
                "name": "composes",
                "plural": false,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "LayoutEdge",
                    "kind": "LinkedField",
                    "name": "edges",
                    "plural": true,
                    "selections": [
                      {
                        "alias": null,
                        "args": null,
                        "concreteType": "Layout",
                        "kind": "LinkedField",
                        "name": "node",
                        "plural": false,
                        "selections": [
                          (v5/*:: as any*/),
                          (v11/*:: as any*/),
                          (v15/*:: as any*/)
                        ],
                        "storageKey": null
                      }
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              },
              (v15/*:: as any*/)
            ],
            "storageKey": null
          },
          (v15/*:: as any*/)
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
      (v1/*:: as any*/),
      (v2/*:: as any*/),
      (v3/*:: as any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "JourneysExplorerQuery",
    "selections": [
      {
        "alias": null,
        "args": (v4/*:: as any*/),
        "concreteType": "JobConnection",
        "kind": "LinkedField",
        "name": "jobs",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "JobEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "Job",
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": [
                  (v5/*:: as any*/),
                  (v6/*:: as any*/),
                  (v7/*:: as any*/),
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Coordinate",
                    "kind": "LinkedField",
                    "name": "coordinates",
                    "plural": false,
                    "selections": [
                      (v5/*:: as any*/),
                      {
                        "alias": null,
                        "args": null,
                        "concreteType": "ActorConnection",
                        "kind": "LinkedField",
                        "name": "actors",
                        "plural": false,
                        "selections": [
                          {
                            "alias": null,
                            "args": null,
                            "concreteType": "ActorEdge",
                            "kind": "LinkedField",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "alias": null,
                                "args": null,
                                "concreteType": "Actor",
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
                        "concreteType": "RoleConnection",
                        "kind": "LinkedField",
                        "name": "roles",
                        "plural": false,
                        "selections": [
                          {
                            "alias": null,
                            "args": null,
                            "concreteType": "RoleEdge",
                            "kind": "LinkedField",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "alias": null,
                                "args": null,
                                "concreteType": "Role",
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
                        "concreteType": "FluencyConnection",
                        "kind": "LinkedField",
                        "name": "fluencies",
                        "plural": false,
                        "selections": [
                          {
                            "alias": null,
                            "args": null,
                            "concreteType": "FluencyEdge",
                            "kind": "LinkedField",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "alias": null,
                                "args": null,
                                "concreteType": "Fluency",
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
        "storageKey": null
      },
      {
        "alias": "head",
        "args": (v9/*:: as any*/),
        "concreteType": "PairingConnection",
        "kind": "LinkedField",
        "name": "pairings",
        "plural": false,
        "selections": (v12/*:: as any*/),
        "storageKey": null
      },
      {
        "alias": "tail",
        "args": (v13/*:: as any*/),
        "concreteType": "PairingConnection",
        "kind": "LinkedField",
        "name": "pairings",
        "plural": false,
        "selections": (v12/*:: as any*/),
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PersonaConnection",
        "kind": "LinkedField",
        "name": "personas",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "PersonaEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "Persona",
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
        "condition": "hasJob",
        "kind": "Condition",
        "passingValue": true,
        "selections": [
          {
            "alias": null,
            "args": (v14/*:: as any*/),
            "concreteType": "Job",
            "kind": "LinkedField",
            "name": "job",
            "plural": false,
            "selections": (v8/*:: as any*/),
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
      (v2/*:: as any*/),
      (v3/*:: as any*/),
      (v0/*:: as any*/)
    ],
    "kind": "Operation",
    "name": "JourneysExplorerQuery",
    "selections": [
      {
        "alias": null,
        "args": (v4/*:: as any*/),
        "concreteType": "JobConnection",
        "kind": "LinkedField",
        "name": "jobs",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "JobEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "Job",
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": [
                  (v5/*:: as any*/),
                  (v6/*:: as any*/),
                  (v7/*:: as any*/),
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": "Coordinate",
                    "kind": "LinkedField",
                    "name": "coordinates",
                    "plural": false,
                    "selections": [
                      (v5/*:: as any*/),
                      {
                        "alias": null,
                        "args": null,
                        "concreteType": "ActorConnection",
                        "kind": "LinkedField",
                        "name": "actors",
                        "plural": false,
                        "selections": [
                          {
                            "alias": null,
                            "args": null,
                            "concreteType": "ActorEdge",
                            "kind": "LinkedField",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "alias": null,
                                "args": null,
                                "concreteType": "Actor",
                                "kind": "LinkedField",
                                "name": "node",
                                "plural": false,
                                "selections": (v16/*:: as any*/),
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
                        "concreteType": "RoleConnection",
                        "kind": "LinkedField",
                        "name": "roles",
                        "plural": false,
                        "selections": [
                          {
                            "alias": null,
                            "args": null,
                            "concreteType": "RoleEdge",
                            "kind": "LinkedField",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "alias": null,
                                "args": null,
                                "concreteType": "Role",
                                "kind": "LinkedField",
                                "name": "node",
                                "plural": false,
                                "selections": (v16/*:: as any*/),
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
                        "concreteType": "FluencyConnection",
                        "kind": "LinkedField",
                        "name": "fluencies",
                        "plural": false,
                        "selections": [
                          {
                            "alias": null,
                            "args": null,
                            "concreteType": "FluencyEdge",
                            "kind": "LinkedField",
                            "name": "edges",
                            "plural": true,
                            "selections": [
                              {
                                "alias": null,
                                "args": null,
                                "concreteType": "Fluency",
                                "kind": "LinkedField",
                                "name": "node",
                                "plural": false,
                                "selections": (v16/*:: as any*/),
                                "storageKey": null
                              }
                            ],
                            "storageKey": null
                          }
                        ],
                        "storageKey": null
                      },
                      (v15/*:: as any*/)
                    ],
                    "storageKey": null
                  },
                  (v15/*:: as any*/)
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
        "alias": "head",
        "args": (v9/*:: as any*/),
        "concreteType": "PairingConnection",
        "kind": "LinkedField",
        "name": "pairings",
        "plural": false,
        "selections": (v17/*:: as any*/),
        "storageKey": null
      },
      {
        "alias": "tail",
        "args": (v13/*:: as any*/),
        "concreteType": "PairingConnection",
        "kind": "LinkedField",
        "name": "pairings",
        "plural": false,
        "selections": (v17/*:: as any*/),
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PersonaConnection",
        "kind": "LinkedField",
        "name": "personas",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "PersonaEdge",
            "kind": "LinkedField",
            "name": "edges",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "concreteType": "Persona",
                "kind": "LinkedField",
                "name": "node",
                "plural": false,
                "selections": (v16/*:: as any*/),
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "condition": "hasJob",
        "kind": "Condition",
        "passingValue": true,
        "selections": [
          {
            "alias": null,
            "args": (v14/*:: as any*/),
            "concreteType": "Job",
            "kind": "LinkedField",
            "name": "job",
            "plural": false,
            "selections": (v16/*:: as any*/),
            "storageKey": null
          }
        ]
      }
    ]
  },
  "params": {
    "cacheID": "2f263f478d667ea32dba385982b259f4",
    "id": null,
    "metadata": {},
    "name": "JourneysExplorerQuery",
    "operationKind": "query",
    "text": "query JourneysExplorerQuery(\n  $jobs: Int!\n  $pairings: Int!\n  $uri: String!\n  $hasJob: Boolean!\n) {\n  jobs(first: $jobs) {\n    edges {\n      node {\n        uri\n        story\n        acceptances\n        coordinates {\n          uri\n          actors {\n            edges {\n              node {\n                uri\n                id\n              }\n            }\n          }\n          roles {\n            edges {\n              node {\n                uri\n                id\n              }\n            }\n          }\n          fluencies {\n            edges {\n              node {\n                uri\n                id\n              }\n            }\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n  head: pairings(first: $pairings) {\n    edges {\n      node {\n        uri\n        pairingRole {\n          uri\n          id\n        }\n        forJob {\n          uri\n          id\n        }\n        arrivals {\n          edges {\n            node {\n              uri\n              id\n            }\n          }\n        }\n        pairsSurface {\n          __typename\n          uri\n          composes {\n            edges {\n              node {\n                uri\n                name\n                id\n              }\n            }\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n  tail: pairings(last: $pairings) {\n    edges {\n      node {\n        uri\n        pairingRole {\n          uri\n          id\n        }\n        forJob {\n          uri\n          id\n        }\n        arrivals {\n          edges {\n            node {\n              uri\n              id\n            }\n          }\n        }\n        pairsSurface {\n          __typename\n          uri\n          composes {\n            edges {\n              node {\n                uri\n                name\n                id\n              }\n            }\n          }\n          id\n        }\n        id\n      }\n    }\n  }\n  personas {\n    edges {\n      node {\n        uri\n        id\n      }\n    }\n  }\n  job(uri: $uri) @include(if: $hasJob) {\n    uri\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "31316aa479038f09e3ece1f29d427429";

export default node;
