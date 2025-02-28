/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { Checkbox, Text, Textarea } from "./inputs/index.js";
import { InputType } from "./types.js";
import type { FieldProps } from "./types.js";

/**
 * description of the Field component
 * @returns {React.ReactElement} - Rendered Field
 */
const Field = ({
	inputType,
	CustomComponent,
	...props
}: FieldProps): React.ReactElement => {
	switch (inputType) {
		case InputType.Textarea:
			return <Textarea {...props} />;
		case InputType.Checkbox:
			return <Checkbox {...props} />;
		case InputType.Custom:
			// @ts-ignore // TODO Add special type for both or none
			return <CustomComponent {...props} />;
		default:
			return <Text inputType={inputType} {...props} />;
	}
};

export default Field;
Field.types = InputType;
