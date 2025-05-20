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
