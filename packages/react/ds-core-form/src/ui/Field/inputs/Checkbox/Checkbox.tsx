/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useFormContext } from "react-hook-form";
import type { CheckboxProps } from "./types.js";
import "./styles.css";
import withWrapper from "../../common/Wrapper/withWrapper.js";

const componentCssClassName = "ds form-checkbox";

/**
 * description of the Checkbox component
 * @returns {React.ReactElement} - Rendered Checkbox
 */
const Checkbox = ({
	id,
	className,
	style,
	name,
	registerProps,
}: CheckboxProps): React.ReactElement => {
	const { register } = useFormContext();
	return (
		<input
			id={id}
			style={style}
			type="checkbox"
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
			{...register(name, registerProps)}
		/>
	);
};

// export default Checkbox;
export default withWrapper(Checkbox);
