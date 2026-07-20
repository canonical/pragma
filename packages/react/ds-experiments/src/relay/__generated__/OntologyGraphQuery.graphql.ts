/**
 * @generated SignedSource<<73fc9b59b5a466e555f00c302e25a06f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type EntityKind = "COMPONENT" | "CONCEPT" | "STANDARD" | "TOKEN" | "%future added value";
export type EntityTier = "APPLICATION" | "DOCS" | "GLOBAL" | "SCDN" | "%future added value";
export type RelationKind = "GOVERNS" | "REFINES" | "SUBCLASS_OF" | "USES" | "%future added value";
export type OntologyGraphQuery$variables = {
  focus?: string | null | undefined;
};
export type OntologyGraphQuery$data = {
  readonly ontology: {
    readonly entities: ReadonlyArray<{
      readonly id: string;
      readonly kind: EntityKind;
      readonly label: string;
      readonly summary: string | null | undefined;
      readonly tier: EntityTier | null | undefined;
    }>;
    readonly relations: ReadonlyArray<{
      readonly id: string;
      readonly kind: RelationKind;
      readonly label: string | null | undefined;
      readonly source: string;
      readonly target: string;
    }>;
  };
};
export type OntologyGraphQuery = {
  response: OntologyGraphQuery$data;
  variables: OntologyGraphQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "focus"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "label",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "kind",
  "storageKey": null
},
v4 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "focus",
        "variableName": "focus"
      }
    ],
    "concreteType": "SchemaGraph",
    "kind": "LinkedField",
    "name": "ontology",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "GraphEntity",
        "kind": "LinkedField",
        "name": "entities",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          (v2/*: any*/),
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "tier",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "summary",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "GraphRelation",
        "kind": "LinkedField",
        "name": "relations",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "source",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "target",
            "storageKey": null
          },
          (v3/*: any*/),
          (v2/*: any*/)
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "OntologyGraphQuery",
    "selections": (v4/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "OntologyGraphQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "2f05e137642019fb3e8b76bea7e89baf",
    "id": null,
    "metadata": {},
    "name": "OntologyGraphQuery",
    "operationKind": "query",
    "text": "query OntologyGraphQuery(\n  $focus: ID\n) {\n  ontology(focus: $focus) {\n    entities {\n      id\n      label\n      kind\n      tier\n      summary\n    }\n    relations {\n      id\n      source\n      target\n      kind\n      label\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "d6dcb1c84779dfbaf688abafca1a3611";

export default node;
