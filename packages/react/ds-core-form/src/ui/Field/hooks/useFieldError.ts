import { useMemo } from "react";
import {
	type FieldError,
	type FieldErrors,
	type FieldErrorsImpl,
	type FieldValues,
	type Merge,
	useFormState,
} from "react-hook-form";

function useFieldError<TFieldValues extends FieldValues = FieldValues>(
	name: string,
) {
	type ErrorTree = FieldErrors<TFieldValues> | FieldError | undefined;

	const { errors } = useFormState({ name }) as FieldErrorsImpl<TFieldValues>;

	const fieldTree = name.split(".");

	// biome-ignore lint/correctness/useExhaustiveDependencies: using a proxy
	const fieldError = useMemo(
		(): FieldError | undefined =>
			// @ts-ignore TODO
			fieldTree.reduce<ErrorTree>((acc: FieldErrors<TFieldValues>, key) => {
				if (acc) {
					return acc[key];
				}
				return undefined;
			}, errors),
		[
			name, //proxy for errors
			// Below, those dependencies are lazily referenced, hence the need to explicitly evaluate them
			// We assume that three levels of nesting is enough for most use cases
			// @ts-ignore TODO
			errors[fieldTree[0]],
			// @ts-ignore TODO
			errors[fieldTree[0]]?.[fieldTree[1]],
			// @ts-ignore TODO
			errors[fieldTree[0]]?.[fieldTree[1]]?.[fieldTree[2]],
		],
	);
	return fieldError;
}

export default useFieldError;
