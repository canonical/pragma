import type React from "react";
import { useState } from "react";
import { ResultsList, SearchControls } from "ui/index.js";
import { useSPARQLQuery } from "../QuadstoreProvider/hooks/index.js";
import * as queries from "../QuadstoreProvider/queries.js";
import type { ContentProps } from "./types.js";

const HARDCODED_EXPERT_QUERY = `
PREFIX ds: <http://syntax.example.org/ontology#>
PREFIX data: <http://syntax.example.org/data/>

SELECT ?pattern ?patternName ?component ?componentName ?subcomponent ?subName WHERE {
  ?pattern a ds:Pattern ;
           ds:name ?patternName ;
           ds:composes ?component .
  ?component ds:name ?componentName .
  OPTIONAL {
    ?component ds:composes ?subcomponent .
    ?subcomponent ds:name ?subName .
  }
}
ORDER BY ?patternName ?componentName ?subName
`;

const Content = ({
	id,
	children,
	className,
	style,
}: ContentProps): React.ReactElement => {
	const [mode, setMode] = useState("normal");
	const [type, setType] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedUri, setSelectedUri] = useState("");

	const sparql =
		mode === "expert"
			? HARDCODED_EXPERT_QUERY
			: queries.makeSearchQuery({ type, searchTerm });

	const results = useSPARQLQuery(sparql);

	return (
		<section
			id={id}
			style={style}
			className={[className].filter(Boolean).join(" ")}
		>
			<SearchControls
				mode={mode}
				setMode={setMode}
				type={type}
				setType={setType}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
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
