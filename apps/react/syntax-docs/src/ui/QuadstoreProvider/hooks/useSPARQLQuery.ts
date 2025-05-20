import { useEffect, useState } from "react";
import useQuadstore from "./useQuadstore.js";

// adjust this to match your ontology namespace
const DS = "http://localhost:5173/schema/ontology.ttl#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";

export default function useSPARQLQuery(type: string, searchTerm: string) {
	const engine = useQuadstore();
	const [results, setResults] = useState<Result[]>([]);

	useEffect(() => {
		if (!engine) return;

		async function run() {
			// clear out old results immediately
			setResults([]);

			// build FILTER clause only if there's a searchTerm
			const filter = searchTerm
				? `FILTER(CONTAINS(LCASE(str(?label)), LCASE("${searchTerm}")))`
				: "";

			const sparql = `
PREFIX ds:   <${DS}>
PREFIX rdfs: <${RDFS}>

SELECT DISTINCT ?s ?label WHERE {
  ${
		type === ""
			? /* wide query, union of ds:name and rdfs:label */ `
  { ?s ds:name  ?label }
  UNION
  { ?s rdfs:label ?label }`
			: /* type-specific */ `
  ?s a ds:${type} ;
     ds:name ?label .`
	}
  ${filter}
}
ORDER BY LCASE(str(?label))
LIMIT 200
      `;

			// for debugging, uncomment:
			// console.log("SPARQL:", sparql);

			const stream = await engine.queryBindings(sparql);
			const rows: Result[] = [];
			stream.on("data", (binding) => {
				rows.push({
					uri: binding.get("s").value,
					label: binding.get("label").value,
				});
			});
			stream.on("end", () => {
				setResults(rows);
			});
		}

		run().catch(console.error);
	}, [engine, type, searchTerm]);

	return results;
}
