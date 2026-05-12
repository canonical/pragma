import type { SPARQL, Store } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { buildQuery } from "../buildQuery.js";
import { P } from "../prefixes.js";

/**
 * Structured hint pointing the user/agent to the correct domain
 * when a name exists in a different domain than the one queried.
 */
export interface CrossDomainHint {
  /** Domain where the name was found (e.g., "modifier"). */
  readonly domain: string;
  /** Entity type label for messages (e.g., "modifier"). */
  readonly entityType: string;
  /** CLI recovery command. */
  readonly cli: string;
  /** MCP recovery tool + params. */
  readonly mcp: { tool: string; params: Record<string, unknown> };
}

interface DomainSpec {
  readonly domain: string;
  readonly entityType: string;
  readonly lookupTool: string;
  readonly cliCommand: string;
  readonly query: (name: string) => SPARQL<string>;
}

const DOMAIN_SPECS: readonly DomainSpec[] = [
  {
    domain: "block",
    entityType: "block",
    lookupTool: "block_lookup",
    cliCommand: "pragma block lookup",
    query: (name) =>
      buildQuery(`
        ASK {
          VALUES ?type { ${P.ds}Component ${P.ds}Pattern ${P.ds}Layout ${P.ds}Subcomponent }
          ?s a ?type ; ${P.ds}name ?name .
          FILTER(LCASE(STR(?name)) = LCASE(${escapeSparqlValue(name)}))
        }
      `),
  },
  {
    domain: "token",
    entityType: "token",
    lookupTool: "token_lookup",
    cliCommand: "pragma token lookup",
    query: (name) =>
      buildQuery(`
        ASK {
          ?s a ${P.ds}Token ; ${P.ds}tokenId ?id .
          FILTER(LCASE(STR(?id)) = LCASE(${escapeSparqlValue(name)}))
        }
      `),
  },
  {
    domain: "modifier",
    entityType: "modifier",
    lookupTool: "modifier_lookup",
    cliCommand: "pragma modifier lookup",
    query: (name) =>
      buildQuery(`
        ASK {
          ?s a ${P.ds}ModifierFamily ; ${P.ds}name ?name .
          FILTER(LCASE(STR(?name)) = LCASE(${escapeSparqlValue(name)}))
        }
      `),
  },
  {
    domain: "standard",
    entityType: "standard",
    lookupTool: "standard_lookup",
    cliCommand: "pragma standard lookup",
    query: (name) =>
      buildQuery(`
        ASK {
          ?s a ${P.cs}CodeStandard ; ${P.cs}name ?name .
          FILTER(LCASE(STR(?name)) = LCASE(${escapeSparqlValue(name)}))
        }
      `),
  },
];

/**
 * Check if a name exists in a domain other than the current one.
 *
 * Queries each domain in a deterministic order (block → token → modifier → standard)
 * and returns the first match. Returns undefined if the name is not found anywhere.
 *
 * @param name - The user-supplied name.
 * @param currentDomain - The domain the user queried (e.g., "token").
 * @param store - ke store for cross-domain queries.
 * @returns Hint pointing to the correct domain, or undefined.
 */
export default async function detectCrossDomain(
  name: string,
  currentDomain: string,
  store: Store,
): Promise<CrossDomainHint | undefined> {
  for (const spec of DOMAIN_SPECS) {
    if (spec.domain === currentDomain) continue;

    const result = await store.query(spec.query(name));
    if (result.type === "ask" && result.result) {
      return {
        domain: spec.domain,
        entityType: spec.entityType,
        cli: `${spec.cliCommand} ${name}`,
        mcp: { tool: spec.lookupTool, params: { names: [name] } },
      };
    }
  }

  return undefined;
}
