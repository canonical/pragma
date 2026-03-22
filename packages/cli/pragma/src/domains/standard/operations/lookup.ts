/**
 * Look up detailed information for a single code standard by name.
 *
 * Queries the base standard data plus its dos and donts code blocks,
 * then assembles a {@link StandardDetailed} object.
 *
 * @param store - ke store to query
 * @param name - standard name (e.g. "react/component/folder-structure")
 * @returns full standard detail including dos/donts code blocks
 * @throws PragmaError.notFound if the standard does not exist
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "#error";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type { CodeBlock, StandardDetailed } from "../../shared/types.js";

export default async function lookupStandard(
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
      recovery: {
        message: "List available standards.",
        cli: "pragma standard list",
        mcp: { tool: "standard_list" },
      },
    });
  }

  // Safe: length check above guarantees bindings[0] exists
  const base = baseResult.bindings[0] as (typeof baseResult.bindings)[number];
  const standardUri = base.standard;

  // Fetch dos (cs:do → cs:Example with cs:description, cs:language, cs:code)
  const dosResult = await store.query(
    buildQuery(`
      SELECT ?description ?language ?code
      WHERE {
        <${standardUri}> ${P.cs}do ?example .
        OPTIONAL { ?example ${P.cs}description ?description }
        OPTIONAL { ?example ${P.cs}language ?language }
        OPTIONAL { ?example ${P.cs}code ?code }
      }
    `),
  );

  const dos: CodeBlock[] =
    dosResult.type === "select"
      ? dosResult.bindings.map((b) => ({
          language: b.language ?? "typescript",
          code: b.code ?? "",
          caption: b.description,
        }))
      : [];

  // Fetch donts (cs:dont → cs:Example with cs:description, cs:language, cs:code)
  const dontsResult = await store.query(
    buildQuery(`
      SELECT ?description ?language ?code
      WHERE {
        <${standardUri}> ${P.cs}dont ?example .
        OPTIONAL { ?example ${P.cs}description ?description }
        OPTIONAL { ?example ${P.cs}language ?language }
        OPTIONAL { ?example ${P.cs}code ?code }
      }
    `),
  );

  const donts: CodeBlock[] =
    dontsResult.type === "select"
      ? dontsResult.bindings.map((b) => ({
          language: b.language ?? "typescript",
          code: b.code ?? "",
          caption: b.description,
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
