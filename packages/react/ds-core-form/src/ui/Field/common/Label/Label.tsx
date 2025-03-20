/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { LabelProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds label";

/** Placeholder for internationalized messages */
const defaultMessages = {
	optional: () => "optional",
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
	isOptional,
	messages = defaultMessages,
	namePrefix = "form-",
	tag: Element = "label",
}: LabelProps): React.ReactElement => {
	return (
		<Element
			id={id}
			style={style}
			htmlFor={Element === "label" ? `${namePrefix}${name}` : undefined}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
		>
			{children || name}
			{isOptional && <span> ({messages.optional()})</span>}
		</Element>
	);
};

export default Label;
