/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import type { ResultsListProps } from "./types.js";

/**
 * description of the ResultsList component
 * @returns {React.ReactElement} - Rendered ResultsList
 */
const ResultsList = ({
	id,
	children,
	className,
	style,
	results,
}: ResultsListProps): React.ReactElement => {
	if (results.length === 0) {
		return <div style={{ fontStyle: "italic" }}>No results</div>;
	}

	return (
		<ul id={id} style={style} className={[className].filter(Boolean).join(" ")}>
			{results.map((r) => (
				<li key={r.uri} style={{ marginBottom: 8 }}>
					<strong>{r.name}</strong>
					<br />
					<small style={{ color: "#666" }}>{r.uri}</small>
				</li>
			))}
		</ul>
	);
};

export default ResultsList;
