/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { LabelProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds label";

const defaultMessages = {
	optional: "optional",
};

/**
 * description of the Label component
 * @returns {React.ReactElement} - Rendered Label
 */
const Label = ({
	id,
	children,
	className,
	style,
	name,
	optional,
	messages,
	as: Element = "label",
}: LabelProps): React.ReactElement => {
	return (
		<Element
			id={id}
			style={style}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
		>
			{children || name}
			{optional && <span> {messages.optional}</span>}
		</Element>
	);
};

export default Label;
