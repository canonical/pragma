/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import { useEffect, useState } from "react";
import type { QuadstoreProviderProps } from "./types.js";

// Quadstore + Comunica for storage & SPARQL
import { Quadstore } from "quadstore";
import { Engine } from "quadstore-comunica";

// Browser‐level backend (IndexedDB) & RDF/JS DataFactory
import { BrowserLevel } from "browser-level";
import { DataFactory } from "rdf-data-factory";

// N3 parser for Turtle → RDF/JS quads
import { Parser } from "n3";

import Context from "./Context.js";

const URLS = ["/schema/ontology.ttl", "/schema/data.ttl"];

/**
 * description of the QuadstoreProvider component
 * @returns {React.ReactElement} - Rendered QuadstoreProvider
 */
const QuadstoreProvider = ({
	children,
}: QuadstoreProviderProps): React.ReactElement => {
	const [engine, setEngine] = useState<Engine | null>(null);

	useEffect(() => {
		async function init() {
			// 1) Create the storage backend (IndexedDB)
			const backend = new BrowserLevel("quadstore-db");
			// 2) Shared DataFactory for Quadstore + N3
			const dataFactory = new DataFactory();

			// 3) Instantiate Quadstore
			const store = new Quadstore({ backend, dataFactory });

			// 4) Instantiate SPARQL engine over that store
			const sparqlEngine = new Engine(store);

			// 5) Open (initialize) the store
			await store.open();
			// (Optional) clear any old data
			// await store.clear();

			// 6) Fetch + parse your TTL files
			const parser = new Parser({ factory: dataFactory });
			for (const url of URLS) {
				const ttlText = await fetch(url).then((r) => r.text());
				// parse() returns an array of RDF/JS Quad objects
				const quads = parser.parse(ttlText);
				// bulk‐load into Quadstore
				await store.multiPut(quads);
			}

			try {
				const countQ = `
     SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }
   `;
				const countStream = await sparqlEngine.queryBindings(countQ);
				countStream.on("data", (b) => {
					console.log(
						"🌐 QuadstoreProvider loaded quads:",
						b.get("count").value,
					);
				});
			} catch (err) {
				console.warn("Could not run quad-count query:", err);
			}

			// 7) Provide the ready‐to‐use SPARQL engine
			setEngine(sparqlEngine);
		}

		init().catch(console.error);
	}, []);

	// show a simple loading state until the store is ready
	if (!engine) {
		return (
			<div style={{ padding: 20, fontFamily: "sans-serif" }}>
				Loading RDF store…
			</div>
		);
	}

	return <Context.Provider value={engine}>{children}</Context.Provider>;
};

export default QuadstoreProvider;
