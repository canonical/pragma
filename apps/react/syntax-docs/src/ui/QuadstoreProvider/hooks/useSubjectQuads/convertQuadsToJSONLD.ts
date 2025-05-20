import { dataset } from "@rdfjs/dataset";
import jsonld from "jsonld";

// This takes RDF/JS quads and a context and returns a JSON-LD document.
export async function convertQuadsToJsonLd(quads: any[], context: any) {
	// Convert to dataset, then n-quads string, then to JSON-LD
	const ds = dataset();
	quads.forEach((q) => ds.add(q));
	const nquads = (await ds.toStream().readable) ? undefined : ""; // node streams
	const expanded = await jsonld.fromRDF(ds.toStream(), {
		format: "application/n-quads",
	});
	return jsonld.compact(expanded, context);
}
