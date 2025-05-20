// useSubjectQuads.ts
import * as queries from "../../queries.js";
import useSPARQLQuery from "../useSPARQLQuery.js";

export default function useSubjectQuads(uri: string, hops = 1) {
	const query = queries.makeSubjectQuadsQuery(uri, hops);
	const quads = useSPARQLQuery(query, {
		queryType: "CONSTRUCT",
	});
	return { quads }; // No loading/error; your hook doesn't return them!
}
