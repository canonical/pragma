/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import type { TextProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-text";

/**
 * description of the Text component
 * @returns {React.ReactElement} - Rendered Text
 */
const Text = ({
	id,
	className,
	style,
	inputType = "text",
	name,
	registerProps,
}: TextProps): React.ReactElement => {
	const { register } = useFormContext();
	return (
		<input
			id={id}
			style={style}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
			type={inputType}
			{...register(name, registerProps)}
		/>
	);
};

export default withWrapper(Text);
