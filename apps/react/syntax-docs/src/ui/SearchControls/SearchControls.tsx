/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import type { SearchControlsProps } from "./types.js";

/**
 * description of the SearchControls component
 * @returns {React.ReactElement} - Rendered SearchControls
 */
const SearchControls = ({
	id,
	children,
	className,
	style,
	type,
	searchTerm,
	setType,
	setSearchTerm,
}: SearchControlsProps): React.ReactElement => {
	return (
		<div
			id={id}
			style={style}
			className={[className].filter(Boolean).join(" ")}
		>
			<label>
				Show&nbsp;
				<select value={type} onChange={(e) => setType(e.target.value)}>
					<option value="">All</option>
					<option value="Class">Class</option>
					<option value="Component">Component</option>
					<option value="Pattern">Pattern</option>
					<option value="Module">Module</option>
					<option value="Token">Token</option>
				</select>
			</label>
			<input
				style={{ marginLeft: 12, padding: "4px 8px" }}
				placeholder="Search by name…"
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
			/>
			<button
				onClick={() => {
					setType("Component"); // or any default you prefer
					setSearchTerm("");
				}}
			>
				Reset
			</button>
		</div>
	);
};

export default SearchControls;
