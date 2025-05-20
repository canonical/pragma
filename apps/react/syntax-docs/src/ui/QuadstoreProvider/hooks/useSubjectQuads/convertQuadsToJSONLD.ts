import jsonld from "jsonld";
import { Store } from "n3";
import * as N3 from "n3";

export async function convertQuadsToJsonLd(quads: any[], context: any) {
	const store = new Store();
	quads.forEach((q) => store.addQuad(q));
	// N3.Store can be consumed as an RDF/JS DatasetCore
	// But jsonld.fromRDF in browser often wants N-Quads string
	const writer = new N3.Writer({ format: "N-Quads" });
	store.getQuads(null, null, null, null).forEach((q) => writer.addQuad(q));
	const nquads = await new Promise<string>((resolve, reject) => {
		writer.end((error, result) => {
			if (error) reject(error);
			else resolve(result);
		});
	});
	const expanded = await jsonld.fromRDF(nquads, {
		format: "application/n-quads",
	});
	// return expanded
	// return jsonld.compact(expanded, context);
	const frame = {
		"@context": context,
		"@embed": "@always",
	};
	return jsonld.frame(expanded, frame);
}
