import { useEffect, useMemo } from "react";
import { type RegisterOptions, useFormContext } from "react-hook-form";

import { useFieldAriaProperties, useFieldError } from "../../../hooks/index.js";
import messages from "../messages.js";

type UseFieldWrapperOptions = {
	label?: string;
	isOptional?: boolean;
	userRegisterProps?: RegisterOptions;
	nestedRegisterProps?: RegisterOptions;
	unregisterOnUnmount?: boolean;
};

/**
 * Hook to provide field wrapper utilities
 * @param name - The name of the field
 * @param options - Additional options
 */
const useFieldWrapper = (
	name: string,
	options: UseFieldWrapperOptions = {},
) => {
	const {
		label,
		isOptional = false,
		userRegisterProps = {},
		nestedRegisterProps = {},
		unregisterOnUnmount = true,
	} = options;

	const fieldError = useFieldError(name);

	const isError = !!fieldError;

	const ariaProps = useFieldAriaProperties(name, isError);

	// Todo if !optional add generic required validation to registerprops

	const registerProps = useMemo(() => {
		const props: RegisterOptions = {};
		if (!isOptional) {
			props.required = {
				value: true,
				// TODO
				// @ts-ignore
				message: messages.required(label || name),
			};
		}
		return {
			...nestedRegisterProps,
			...props,
			...userRegisterProps,
		};
	}, [name, label, isOptional, userRegisterProps, nestedRegisterProps]);

	const { unregister } = useFormContext();

	useEffect(
		() => () => (unregisterOnUnmount ? unregister(name) : undefined),
		[unregisterOnUnmount, name, unregister],
	);

	return {
		fieldError,
		isError,
		ariaProps,
		registerProps,
	};
};
export default useFieldWrapper;
