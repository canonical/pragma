import useSPARQLQuery from "../useSPARQLQuery.js"; // adjust import if needed

export default function useSubjectQuads(uri: string, hops = 1) {
	const query = makeSubjectQuadsQuery(uri, hops);

	// You probably have a transform function for SELECT, but with CONSTRUCT you get quads.
	// Let's assume your useSPARQLQuery can return quads directly for CONSTRUCT.
	// If not, you may need to use your quadstore engine directly for CONSTRUCTs.

	// For illustration, let's say your hook returns { data, loading, error }
	const {
		data: quads,
		loading,
		error,
	} = useSPARQLQuery(query, /*transform=*/ null, {
		queryType: "CONSTRUCT",
	});

	return { quads, loading, error };
}
