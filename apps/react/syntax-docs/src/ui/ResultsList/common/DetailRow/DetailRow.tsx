/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import { useSPARQLQuery } from "../../../QuadstoreProvider/hooks/index.js";
import { makeDetailQuery } from "../../../QuadstoreProvider/queries.js";
import {
	type Detail,
	transformDetail,
} from "../../../QuadstoreProvider/transformers.js";
import type { DetailRowProps } from "./types.js";

/**
 * description of the DetailRow component
 * @returns {React.ReactElement} - Rendered DetailRow
 */
const DetailRow = ({
	id,
	children,
	className,
	style,
	uri,
}: DetailRowProps): React.ReactElement => {
	const detailQuery = makeDetailQuery(uri);
	// Pass custom transformer to preserve full term data
	const rows = useSPARQLQuery<Detail>(detailQuery, {
		transformer: transformDetail,
	});
	return (
		<div
			id={id}
			style={style}
			className={["row", "detail", className].filter(Boolean).join(" ")}
		>
			<div className="cell" style={{ gridColumn: "1 / -1" }}>
				<pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
					{JSON.stringify(rows, null, 2)}
				</pre>
			</div>
			{children}
		</div>
	);
};

export default DetailRow;
