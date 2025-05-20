import type { Bindings } from "@comunica/types";
import { useEffect, useState } from "react";
import * as transformers from "../transformers.js";
import useQuadstore from "./useQuadstore.js";

export interface Result {
	uri: string;
	label: string;
	typeUri: string | null;
}

type QueryType = "SELECT" | "CONSTRUCT";

interface UseSPARQLQueryOptions<T> {
	queryType?: QueryType;
	transformer?: (b: Bindings) => T;
}

export default function useSPARQLQuery<T = Result>(
	query: string,
	options: UseSPARQLQueryOptions<T> = {},
): T[] | any[] {
	const engine = useQuadstore();
	const [results, setResults] = useState<T[] | any[]>([]);
	const {
		queryType = "SELECT",
		transformer = transformers.defaultTransform as (b: Bindings) => T,
	} = options;

	useEffect(() => {
		if (!engine || !query) return;

		async function run() {
			setResults([]);
			if (queryType === "CONSTRUCT") {
				const stream = await engine.queryQuads(query);
				const quads: any[] = [];
				stream.on("data", (quad) => quads.push(quad));
				stream.on("end", () => setResults(quads));
			} else {
				const stream = await engine.queryBindings(query);
				const rows: T[] = [];
				stream.on("data", (binding) => rows.push(transformer(binding)));
				stream.on("end", () => setResults(rows));
			}
		}

		run().catch(console.error);
	}, [engine, query, transformer, queryType]);

	return results;
}
