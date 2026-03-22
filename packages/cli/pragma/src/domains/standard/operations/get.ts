/**
 * Get detailed information for a single standard.
 *
 * Pure function: Store + name → StandardDetailed.
 *
 * @throws PragmaError.notFound if the standard does not exist.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { CodeBlock, StandardDetailed } from "../../shared/types.js";

export default async function getStandard(
  store: Store,
  name: string,
): Promise<StandardDetailed> {
  const escaped = escapeSparqlValue(name);

  const baseResult = await store.query(
    buildQuery(`
      SELECT ?standard ?categoryName ?description
      WHERE {
        ?standard a ${P.cs}CodeStandard ;
                  ${P.cs}name ${escaped} ;
                  ${P.cs}description ?description .
        OPTIONAL {
          ?standard ${P.cs}hasCategory ?cat .
          ?cat ${P.cs}slug ?categoryName .
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

  // Safe: length check above guarantees bindings[0] exists
  const base = baseResult.bindings[0] as (typeof baseResult.bindings)[number];
  const standardUri = base.standard;

  // Fetch dos
  const dosResult = await store.query(
    buildQuery(`
      SELECT ?doText
      WHERE { <${standardUri}> ${P.cs}dos ?doText }
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
      WHERE { <${standardUri}> ${P.cs}donts ?dontText }
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
