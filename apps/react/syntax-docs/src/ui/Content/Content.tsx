/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import { useState } from "react";
import { ResultsList, SearchControls } from "ui/index.js";
import { useSPARQLQuery } from "../QuadstoreProvider/hooks/index.js";
import * as queries from "../QuadstoreProvider/queries.js";
import type { ContentProps } from "./types.js";

/**
 * description of the Content component
 * @returns {React.ReactElement} - Rendered Content
 */
const Content = ({
	id,
	children,
	className,
	style,
}: ContentProps): React.ReactElement => {
	const [type, setType] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedUri, setSelectedUri] = useState("");
	const sparql = queries.makeSearchQuery({ type, searchTerm });
	const results = useSPARQLQuery(sparql);
	return (
		<section
			id={id}
			style={style}
			className={[className].filter(Boolean).join(" ")}
		>
			<SearchControls
				className="row"
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				type={type}
				setType={setType}
			/>
			<ResultsList
				className="row"
				results={results}
				selectedUri={selectedUri}
				setSelectedUri={setSelectedUri}
			/>
		</section>
	);
};

export default Content;
