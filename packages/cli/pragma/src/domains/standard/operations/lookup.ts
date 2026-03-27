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
import resolveUri from "../../graph/helpers/resolveUri.js";
import { buildQuery } from "../../shared/buildQuery.js";
import compactUri from "../../shared/compactUri.js";
import { P } from "../../shared/prefixes.js";
import type { CodeBlock, StandardDetailed } from "../../shared/types/index.js";

export default async function lookupStandard(
  store: Store,
  nameOrUri: string,
): Promise<StandardDetailed> {
  const subjectClause = buildLookupSubjectClause(nameOrUri, store.prefixes);
  const bindClause =
    subjectClause === null ? "" : `BIND(${subjectClause} AS ?standard)`;
  const matchClause =
    subjectClause === null
      ? `?standard ${P.cs}name ${escapeSparqlValue(nameOrUri)} .`
      : "";

  const baseResult = await store.query(
    buildQuery(`
      SELECT ?standard ?name ?categoryName ?description ?extends
      WHERE {
        ${bindClause}
        ?standard a ${P.cs}CodeStandard ;
                  ${P.cs}name ?name ;
                  ${P.cs}description ?description .
        ${matchClause}
        OPTIONAL {
          ?standard ${P.cs}hasCategory ?cat .
          ?cat ${P.cs}slug ?categoryName .
        }
        OPTIONAL { ?standard ${P.cs}extends ?extends }
      }
      LIMIT 1
    `),
  );

  if (baseResult.type !== "select" || baseResult.bindings.length === 0) {
    throw PragmaError.notFound("standard", nameOrUri, {
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
    name: base.name ?? nameOrUri,
    category: base.categoryName ?? "",
    description: base.description ?? "",
    extends: base.extends
      ? compactUri(base.extends, store.prefixes)
      : undefined,
    dos,
    donts,
  };
}

function buildLookupSubjectClause(
  query: string,
  prefixes: Readonly<Record<string, string>>,
): string | null {
  if (!looksLikeUri(query)) {
    return null;
  }

  return `<${resolveUri(query, prefixes)}>`;
}

function looksLikeUri(query: string): boolean {
  return (
    query.startsWith("http://") ||
    query.startsWith("https://") ||
    query.includes(":")
  );
}
