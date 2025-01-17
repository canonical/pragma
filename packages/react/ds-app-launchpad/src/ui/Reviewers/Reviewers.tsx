/* @canonical/generator-canonical-ds 0.4.0-experimental.0 */
import type React from "react";
import "./styles.css";
import type { ReviewersPropsType } from "./types.js";

const componentCssClassName = "ds reviewers";

/**
 * description of the Reviewers component
 * @returns {React.ReactElement} - Rendered Reviewers
 */
const Reviewers = ({
	id,
	className,
	style,
}: ReviewersPropsType): React.ReactElement => {
	return (
		<div
			id={id}
			style={style}
			className={[componentCssClassName, appearance, className]
				.filter(Boolean)
				.join(" ")}
		>
			<div className="title">
				<h2>Reviewers</h2>
				<p>button</p>
			</div>
		</div>
	);
};

export default Reviewers;
