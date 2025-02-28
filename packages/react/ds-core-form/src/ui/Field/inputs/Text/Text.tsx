/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { TextProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds text";

/**
 * description of the Text component
 * @returns {React.ReactElement} - Rendered Text
 */
const Text = ({
	id,
	children,
	className,
	style,
	inputType,
}: TextProps): React.ReactElement => {
	return (
		<input
			id={id}
			style={style}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
			type={inputType}
		/>
	);
};

export default Text;
