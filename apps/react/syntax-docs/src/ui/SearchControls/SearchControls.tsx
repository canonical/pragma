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
					<option>Component</option>
					<option>Pattern</option>
					<option>Module</option>
					<option>Token</option>
				</select>
			</label>
			<input
				style={{ marginLeft: 12, padding: "4px 8px" }}
				placeholder="Search by name…"
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
			/>
		</div>
	);
};

export default SearchControls;
