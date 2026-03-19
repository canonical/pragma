/**
 * Standard shared operations.
 *
 * Pure functions: Store → typed data.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import { buildQuery } from "../shared/buildQuery.js";
import type {
  CodeBlock,
  StandardDetailed,
  StandardSummary,
} from "../shared/types.js";

/**
 * List all code standards.
 */
export async function listStandards(store: Store): Promise<StandardSummary[]> {
  const result = await store.query(
    buildQuery(`
      SELECT ?standard ?name ?categoryName ?description
      WHERE {
        ?standard a cso:CodeStandard ;
                  cso:name ?name ;
                  cso:description ?description .
        OPTIONAL {
          ?standard cso:category ?cat .
          ?cat cso:categoryName ?categoryName .
        }
      }
      ORDER BY ?name
    `),
  );

  if (result.type !== "select") return [];

  return result.bindings.map((b) => ({
    uri: (b.standard ?? "") as URI,
    name: b.name ?? "",
    category: b.categoryName ?? "",
    description: b.description ?? "",
  }));
}

/**
 * Get detailed information for a single standard.
 *
 * @throws PragmaError.notFound if the standard does not exist.
 */
export async function getStandard(
  store: Store,
  name: string,
): Promise<StandardDetailed> {
  const escaped = escapeSparqlValue(name);

  const baseResult = await store.query(
    buildQuery(`
      SELECT ?standard ?categoryName ?description
      WHERE {
        ?standard a cso:CodeStandard ;
                  cso:name ${escaped} ;
                  cso:description ?description .
        OPTIONAL {
          ?standard cso:category ?cat .
          ?cat cso:categoryName ?categoryName .
        }
      }
      LIMIT 1
    `),
  );

  if (baseResult.type !== "select" || baseResult.bindings.length === 0) {
    throw PragmaError.notFound("standard", name, {
      recovery: "Run `pragma standard list` to see available standards.",
    });
  }

  const base = baseResult.bindings[0]!;
  const standardUri = base.standard;

  // Fetch dos
  const dosResult = await store.query(
    buildQuery(`
      SELECT ?doText
      WHERE { <${standardUri}> cso:do ?doText }
    `),
  );

  const dos: CodeBlock[] =
    dosResult.type === "select"
      ? dosResult.bindings.map((b) => ({
          language: "typescript",
          code: b.doText ?? "",
        }))
      : [];

  // Fetch donts
  const dontsResult = await store.query(
    buildQuery(`
      SELECT ?dontText
      WHERE { <${standardUri}> cso:dont ?dontText }
    `),
  );

  const donts: CodeBlock[] =
    dontsResult.type === "select"
      ? dontsResult.bindings.map((b) => ({
          language: "typescript",
          code: b.dontText ?? "",
        }))
      : [];

  return {
    uri: (standardUri ?? "") as URI,
    name,
    category: base.categoryName ?? "",
    description: base.description ?? "",
    dos,
    donts,
  };
}

/**
 * List all standard categories with their names.
 */
export async function listCategories(store: Store): Promise<string[]> {
  const result = await store.query(
    buildQuery(`
      SELECT DISTINCT ?categoryName
      WHERE {
        ?cat a cso:Category ;
             cso:categoryName ?categoryName .
      }
      ORDER BY ?categoryName
    `),
  );

  if (result.type !== "select") return [];
  return result.bindings.map((b) => b.categoryName ?? "");
}
