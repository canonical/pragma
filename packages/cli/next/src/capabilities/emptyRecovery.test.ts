/**
 * Empty-result recovery (PROTECTED).
 *
 * When a bundled pack's list resolves to zero rows on an otherwise-available
 * store, it fails with a typed EMPTY_RESULTS carrying the pack's declared
 * recovery — the v2 vocabulary points at `pragma sources update` (build the
 * store from the configured packages), not an empty render.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PragmaError } from "../kernel/error/PragmaError.js";
import { compilePack } from "../kernel/packs/compile.js";
import { verbKey } from "../kernel/packs/uniqueness.js";
import { DEFAULT_PREFIX_MAP } from "../kernel/render/prefixes.js";
import type { PragmaRuntime } from "../kernel/runtime/types.js";
import type { VerbSpec } from "../kernel/spec/types.js";
import { buildFixtureRuntime } from "../testing/helpers/packRuntime.js";
import { modifierPack } from "./modifier/pack.js";
import { tokenPack } from "./token/pack.js";

const PREFIXES = {
  ds: "https://ds.canonical.com/",
  owl: "http://www.w3.org/2002/07/owl#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

// The ontology (TBox) with NO individuals — a booted-but-empty store.
const TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ds:ModifierFamily a owl:Class .
ds:Modifier a owl:Class .
ds:Token a owl:Class .
ds:TokenType a owl:Class .
ds:name a owl:DatatypeProperty ; rdfs:domain ds:ModifierFamily ; rdfs:range xsd:string .
ds:hasModifier a owl:ObjectProperty ; rdfs:domain ds:ModifierFamily ; rdfs:range ds:Modifier .
ds:modifierFamily a owl:ObjectProperty ; rdfs:domain ds:Modifier ; rdfs:range ds:ModifierFamily .
ds:tokenId a owl:DatatypeProperty ; rdfs:domain ds:Token ; rdfs:range xsd:string .
ds:tokenType a owl:ObjectProperty ; rdfs:domain ds:Token ; rdfs:range ds:TokenType .
`;

let rt: PragmaRuntime;
beforeAll(async () => {
  ({ rt } = await buildFixtureRuntime({ ttl: TTL, prefixes: PREFIXES }));
});
afterAll(async () => {
  (await rt.store.get()).store.dispose();
});

const listVerb = (pack: typeof modifierPack): VerbSpec =>
  compilePack(pack, `bundled:${pack.noun}`, DEFAULT_PREFIX_MAP).find(
    (v) => verbKey(v.path) === `${pack.noun} list`,
  ) as VerbSpec;

describe("pack emptyRecovery (PROTECTED)", () => {
  it("modifier list on an empty store fails with `pragma sources update`", async () => {
    try {
      await listVerb(modifierPack).run({}, rt);
      throw new Error("expected EMPTY_RESULTS");
    } catch (error) {
      expect(error).toBeInstanceOf(PragmaError);
      const pragma = error as PragmaError;
      expect(pragma.code).toBe("EMPTY_RESULTS");
      expect(pragma.recovery?.cli).toBe("pragma sources update");
    }
  });

  it("token list on an empty store fails with `pragma sources update`", async () => {
    try {
      await listVerb(tokenPack).run({}, rt);
      throw new Error("expected EMPTY_RESULTS");
    } catch (error) {
      expect((error as PragmaError).code).toBe("EMPTY_RESULTS");
      expect((error as PragmaError).recovery?.cli).toBe(
        "pragma sources update",
      );
    }
  });
});
