import type { Bindings } from "@comunica/types";
import { useEffect, useState } from "react";
import useQuadstore from "./useQuadstore.js";

export interface Result {
	uri: string;
	label: string;
	typeUri: string | null;
}

/**
 * Convert a single SPARQL binding row into our Result object.
 */
function transformBinding(binding: Bindings): Result {
	return {
		uri: binding.get("s")?.value ?? "",
		label: binding.get("label")?.value ?? "",
		typeUri: binding.has("t") ? binding.get("t")!.value : null,
	};
}

/**
 * Hook performing a SPARQL query and returning an array of Results.
 * @param query - the SPARQL query string to execute
 */
export default function useSPARQLQuery(query: string): Result[] {
	const engine = useQuadstore();
	const [results, setResults] = useState<Result[]>([]);

	useEffect(() => {
		if (!engine || !query) return;

		async function run() {
			setResults([]);

			const stream = await engine.queryBindings(query);
			const rows: Result[] = [];

			stream.on("data", (binding) => {
				rows.push(transformBinding(binding));
			});
			stream.on("end", () => {
				setResults(rows);
			});
		}

		run().catch(console.error);
	}, [engine, query]);

	return results;
}
