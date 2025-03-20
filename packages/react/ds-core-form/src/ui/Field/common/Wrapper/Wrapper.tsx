/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { WrapperProps } from "./types.js";
import "./styles.css";
import { Description, Error as FieldError, Label } from "../index.js";
import { useFieldWrapper } from "./hooks/index.js";

const componentCssClassName = "ds form-wrapper";

/**
 * description of the Wrapper component
 * @returns {React.ReactElement} - Rendered Wrapper
 */
const Wrapper = ({
	id,
	children,
	className,
	style,

	name,
	Component,
	description,
	label,
	isOptional,
	registerProps: userRegisterProps,
	nestedRegisterProps,
	unregisterOnUnmount,

	mockLabel = false,
	...otherProps
}: WrapperProps): React.ReactElement => {
	const { fieldError, isError, ariaProps, registerProps } = useFieldWrapper(
		name,
		{
			label,
			isOptional,
			userRegisterProps,
			nestedRegisterProps,
			unregisterOnUnmount,
		},
	);

	return (
		<div
			id={id}
			style={style}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
		>
			<Description {...ariaProps.description}>{description}</Description>
			<Label
				name={name}
				isOptional={isOptional}
				tag={mockLabel ? "legend" : undefined}
				{...ariaProps.label}
			>
				{label}
			</Label>
			<Component
				name={name}
				registerProps={registerProps}
				{...ariaProps.input}
				{...otherProps}
			/>
			{isError && (
				<FieldError {...ariaProps.error}>
					{fieldError?.message?.toString()}
				</FieldError>
			)}
			{children}
		</div>
	);
};

export default Wrapper;
