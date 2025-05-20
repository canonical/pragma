// ui/QuadstoreProvider/queries.ts

// adjust these to match your @prefixes
const DS = "http://syntax.example.org/ontology#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";

export interface SearchVars {
	type: string;
	searchTerm: string;
}

export function makeSearchQuery({ type, searchTerm }: SearchVars): string {
	const filterClause = searchTerm
		? `FILTER(CONTAINS(LCASE(str(?label)), LCASE("${searchTerm}")))`
		: "";

	return `
 PREFIX ds:   <${DS}>
 PREFIX rdfs: <${RDFS}>

 SELECT DISTINCT ?s ?label ?t
       (STRAFTER(strbefore(str(?s), "#"), "/") AS ?ns)  # extract namespace
 WHERE {
   ${
			type === ""
				? `
     { ?s ds:name    ?label }
     UNION
     { ?s rdfs:label ?label }`
				: `
     ?s a ds:${type} ;
        ds:name ?label .`
		}
   OPTIONAL { ?s a ?t }
   ${filterClause}
 }
ORDER BY ?ns       # namespace ascending
         LCASE(str(?label))
 LIMIT 200
 `.trim();
}

/**
 * Query the full set of predicate-object pairs for a given subject URI,
 * aliasing them so they slot into useSPARQLQuery’s “s” and “label” fields.
 */
export function makeDetailQuery(uri: string): string {
	return `
PREFIX ds:   <${DS}>
PREFIX rdfs: <${RDFS}>

SELECT 
  (?p AS ?predicate) 
  (?o AS ?object)
WHERE { <${uri}> ?p ?o }
ORDER BY ?p
`.trim();
}

export function makeSubjectQuadsQuery(uri: string, hops = 1): string {
	let construct = `<${uri}> ?p1 ?o1 .\n`;
	let where = `<${uri}> ?p1 ?o1 .\n`;
	let lastVar = "?o1";

	for (let i = 2; i <= hops; ++i) {
		construct += `${lastVar} ?p${i} ?o${i} .\n`;
		where += `OPTIONAL { ${lastVar} ?p${i} ?o${i} . }\n`;
		lastVar = `?o${i}`;
	}

	return `
CONSTRUCT {
  ${construct}
}
WHERE {
  ${where}
}
`.trim();
}
