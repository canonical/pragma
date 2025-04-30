/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import { useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { useOptionAriaProperties } from "../../hooks/index.js";
import type { WrapperProps } from "../../types.js";
import type { OptionProps, SimpleChoicesProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-simple-choices";
const optionClassName = "option";

const Option = ({
	name,
	type,
	value,
	label,
	register,
	registerProps,
	disabled,
}: OptionProps): React.ReactElement => {
	const ariaProps = useOptionAriaProperties(name, value);
	return (
		<div
			className={[optionClassName, "grid", disabled && "disabled"]
				.filter(Boolean)
				.join(" ")}
			key={value}
		>
			<input
				value={value}
				disabled={disabled || false}
				type={type}
				{...register(name, registerProps)}
				{...ariaProps.input}
			/>
			{/* biome-ignore lint/a11y/noLabelWithoutControl : is indeed provided but undetected*/}
			<label {...ariaProps.label}>{label}</label>
		</div>
	);
};

/**
 * description of the SimpleChoices component
 * @returns {React.ReactElement} - Rendered SimpleChoices
 */
const SimpleChoices = ({
	id,
	className,
	style,
	name,
	isMultiple = false,
	disabled = false,
	options,
	registerProps,
}: SimpleChoicesProps): React.ReactElement => {
	const { register } = useFormContext();

	const type = isMultiple ? "checkbox" : "radio";

	return (
		// Open for discussion, shall we use a fieldset or a div?
		<fieldset
			id={id}
			style={style}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
		>
			{options.map((option) => (
				<Option
					key={option.value}
					name={name}
					type={type}
					register={register}
					registerProps={registerProps}
					value={option.value}
					label={option.label}
					disabled={disabled || Boolean(option.disabled)}
				/>
			))}
		</fieldset>
	);
};

export default withWrapper<SimpleChoicesProps>(
	// We mock the label to be a legend, as the "true" label is rendered by the individual options
	SimpleChoices,
	{ mockLabel: true },
);
