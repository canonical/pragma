/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import type { SearchControlsProps } from "./types.js";
import "./styles.css";

const componentClassName = "ds search-controls";

/**
 * description of the SearchControls component
 * @returns {React.ReactElement} - Rendered SearchControls
 */
const SearchControls = ({
	mode,
	setMode,
	type,
	setType,
	searchTerm,
	setSearchTerm,
	sparqlQuery,
	setSparqlQuery,
	runSparql,
	...rest
}: SearchControlsProps) => (
	<div className="ds search-controls" {...rest}>
		<label>
			<input
				type="radio"
				checked={mode === "normal"}
				onChange={() => setMode("normal")}
			/>
			Normal
		</label>
		<label style={{ marginLeft: 12 }}>
			<input
				type="radio"
				checked={mode === "sparql"}
				onChange={() => setMode("sparql")}
			/>
			SPARQL
		</label>
		{mode === "normal" ? (
			<>
				<label htmlFor="type">Show </label>
				<select
					value={type}
					onChange={(e) => setType(e.target.value)}
					id="type"
				>
					<option value="">All</option>
					<option value="Class">Class</option>
					<option value="Component">Component</option>
					<option value="Pattern">Pattern</option>
					<option value="Module">Module</option>
					<option value="Token">Token</option>
				</select>
				<div className="search">
					<input
						placeholder="Search by name…"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
					<button
						onClick={() => {
							setType("");
							setSearchTerm("");
						}}
					>
						Reset
					</button>
				</div>
			</>
		) : (
			<div
				className="search"
				style={{ flexDirection: "column", width: "100%" }}
			>
				<textarea
					style={{ width: "100%", fontFamily: "monospace", margin: "8px 0" }}
					rows={4}
					value={sparqlQuery}
					onChange={(e) => setSparqlQuery(e.target.value)}
					placeholder="Enter any SPARQL SELECT query..."
				/>
				<button
					onClick={runSparql}
					// disabled={!sparqlQuery?.trim().toLowerCase().startsWith("select")}
					style={{ alignSelf: "flex-end" }}
				>
					Run Query
				</button>
			</div>
		)}
	</div>
);

export default SearchControls;
