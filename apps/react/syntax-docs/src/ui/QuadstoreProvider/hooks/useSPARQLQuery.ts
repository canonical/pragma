import { useEffect, useState } from "react";
import useQuadstore from "./useQuadstore.js";

// adjust this to match your ontology namespace
const DS = "http://example.org/design-system#";

const useSPQARQLQuery = (type: string, searchTerm: string) => {
	const engine = useQuadstore();
	const [results, setResults] = useState([]);
	console.log("Using query with", type, searchTerm);

	useEffect(() => {
		if (!engine) return;

		async function run() {
			const query = `
        PREFIX ds: <${DS}>
        SELECT ?s ?name WHERE {
          ?s a ds:${type} ;
             ds:name ?name .
          FILTER(CONTAINS(LCASE(str(?name)), LCASE("${searchTerm}")))
        }
        ORDER BY LCASE(str(?name))
      `;
			const stream = await engine.queryBindings(query);
			const rows = [];
			stream.on("data", (binding) => {
				rows.push({
					uri: binding.get("s").value,
					name: binding.get("name").value,
				});
			});
			stream.on("end", () => setResults(rows));
		}

		run().catch(console.error);
	}, [engine, type, searchTerm]);

	return results;
};

export default useSPQARQLQuery;
