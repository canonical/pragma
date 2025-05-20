import type React from "react";
import type { ResultsListProps } from "./types.js";
import "./styles.css";
import { DetailRow } from "./common/index.js";

const componentClassName = "ds results-list";

/**
 * Split an IRI into namespace + local name
 */
function splitIRI(iri: string): { ns: string; local: string } {
	const idx = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"));
	return idx >= 0
		? { ns: iri.slice(0, idx + 1), local: iri.slice(idx + 1) }
		: { ns: iri, local: "" };
}

/**
 * Component to show details for a selected URI
 */

const ResultsList = ({
	id,
	className = "",
	style,
	results,
	selectedUri,
	setSelectedUri,
}: ResultsListProps): React.ReactElement => {
	if (results.length === 0) {
		return <div style={{ fontStyle: "italic" }}>No results</div>;
	}

	return (
		<div
			id={id}
			style={style}
			className={[componentClassName, className].filter(Boolean).join(" ")}
			role="grid"
			aria-colcount={3}
		>
			{/* header row */}
			<div role="row" className="row header">
				<div role="columnheader" aria-colindex={1} className="cell">
					Namespace
				</div>
				<div role="columnheader" aria-colindex={2} className="cell">
					Name
				</div>
				<div role="columnheader" aria-colindex={3} className="cell">
					Type
				</div>
			</div>

			{/* data rows with optional detail row */}
			{results.flatMap((r) => {
				const isSelected = selectedUri === r.uri;
				const row = (
					<div
						key={`row-${r.uri}`}
						role="row"
						className={["row", isSelected ? "selected" : ""]
							.filter(Boolean)
							.join(" ")}
						onClick={() => setSelectedUri(r.uri)}
					>
						<div role="gridcell" aria-colindex={1} className="cell">
							<code>{splitIRI(r.uri).ns}</code>
						</div>
						<div role="gridcell" aria-colindex={2} className="cell">
							{r.label}
						</div>
						<div
							role="gridcell"
							aria-colindex={3}
							aria-colspan={r.typeUri ? 1 : 2}
							className="cell"
						>
							{r.typeUri ? splitIRI(r.typeUri).local : "–"}
						</div>
					</div>
				);
				return isSelected
					? [row, <DetailRow key={`detail-${r.uri}`} uri={r.uri} />]
					: [row];
			})}
		</div>
	);
};

export default ResultsList;
