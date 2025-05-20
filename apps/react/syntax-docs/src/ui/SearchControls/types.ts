export interface SearchControlsProps {
	id?: string;
	className?: string;
	style?: React.CSSProperties;
	mode: "normal" | "sparql";
	setMode: (mode: "normal" | "sparql") => void;

	// For normal search
	type: string;
	searchTerm: string;
	setType: (type: string) => void;
	setSearchTerm: (searchTerm: string) => void;

	// For SPARQL mode
	sparqlQuery: string;
	setSparqlQuery: (q: string) => void;
	runSparql: () => void;
}
