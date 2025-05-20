import type React from "react";
import { useEffect, useState } from "react";
import {
	useSPARQLQuery,
	useSubjectQuads,
} from "../../../QuadstoreProvider/hooks/index.js";
import { convertQuadsToJsonLd } from "../../../QuadstoreProvider/hooks/useSubjectQuads/convertQuadsToJSONLD.js";
import { makeDetailQuery } from "../../../QuadstoreProvider/queries.js";
import {
	type Detail,
	transformDetail,
} from "../../../QuadstoreProvider/transformers.js";
import type { DetailRowProps } from "./types.js";

const JSONLD_CONTEXT = {
	"@vocab": "http://syntax.example.org/ontology#",
	ds: "http://syntax.example.org/ontology#",
	data: "http://syntax.example.org/data/",
	xsd: "http://www.w3.org/2001/XMLSchema#",
};

export default function DetailRow({
	id,
	children,
	className,
	style,
	uri,
}: DetailRowProps): React.ReactElement {
	const detailQuery = makeDetailQuery(uri);
	const rows = useSPARQLQuery<Detail>(detailQuery, {
		transformer: transformDetail,
	});

	// JSON-LD export state
	const [jsonld, setJsonld] = useState<any>(null);
	const { quads } = useSubjectQuads(uri, 2); // 2 hops = get blank nodes e.g. affordances/requirements

	useEffect(() => {
		if (!quads || quads.length === 0) return;
		let cancelled = false;
		convertQuadsToJsonLd(quads, JSONLD_CONTEXT)
			.then((doc) => {
				if (!cancelled) setJsonld(doc);
			})
			.catch((err) => {
				console.error("JSON-LD conversion failed:", err);
				if (!cancelled) setJsonld(null);
			});
		return () => {
			cancelled = true;
		};
	}, [quads]);

	return (
		<div
			id={id}
			style={style}
			className={["row", "detail", className].filter(Boolean).join(" ")}
		>
			{/* left: triples details (as before) */}
			<div className="cell" style={{ gridColumn: "1 / 4" }}>
				<pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
					{JSON.stringify(rows, null, 2)}
				</pre>
			</div>
			{/* right: JSON-LD card */}
			<div
				className="cell"
				style={{ gridColumn: "4 / -1", background: "#f8f8f8" }}
			>
				{jsonld ? (
					<pre
						style={{
							fontSize: 12,
							overflowX: "auto",
							background: "#f8f8f8",
							padding: 8,
							borderRadius: 4,
							margin: 0,
						}}
					>
						{JSON.stringify(jsonld, null, 2)}
					</pre>
				) : (
					<em>Loading JSON-LD…</em>
				)}
			</div>
			{children}
		</div>
	);
}
