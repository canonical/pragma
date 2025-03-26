/* @canonical/generator-ds 0.9.0-experimental.9 */
import { type UseComboboxStateChange, useCombobox } from "downshift";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useController } from "react-hook-form";
import type { ComboboxProps } from "./types.js";
import "./styles.css";
import { List, ResetButton } from "./common/index.js";
import { VALUE_KEY } from "./constants.js";
import {
	convertOptionToString as defaultConvertOptionToString,
	convertValueToOption as defaultConvertValueToOption,
	filterOptions as defaultFilterOptions,
} from "./utils/index.js";
const componentCssClassName = "ds combobox";

/**
 * description of the SingleCombobox component
 * @returns {React.ReactElement} - Rendered SingleCombobox
 */
const SingleCombobox = ({
	id,
	className,
	style,
	registerProps,
	options,
	name,
	disabled = false,
	openOnReset = false,
	onInputValueChangeFactory,
	placeholder,
	valueKey = VALUE_KEY,
	convertOptionToString = defaultConvertOptionToString,
	convertValueToOption = defaultConvertValueToOption,
	filterOptions = defaultFilterOptions,
}: ComboboxProps): React.ReactElement => {
	const [items, setItems] = useState(options);

	const {
		field: { onChange, onBlur, ref: RHFRef, value: RHFValue },
	} = useController({
		name,
		rules: registerProps,
	});

	const handleSelectedItemChange = useCallback(
		(changes: UseComboboxStateChange<ComboboxOption>) => {
			onChange(changes.selectedItem?.[valueKey] || undefined);
		},
		[onChange, valueKey],
	);

	const defaultOnInputValueChangeFactory = useCallback(
		(stateUpdater) =>
			({ inputValue }) =>
				stateUpdater((state) => filterOptions(options, inputValue)),
		[options],
	);

	const {
		isOpen,
		// inputValue,
		openMenu,
		// setInputValue,
		// getToggleButtonProps,
		selectItem,
		selectedItem,
		getMenuProps,
		getInputProps,
		highlightedIndex,
		getItemProps,
	} = useCombobox({
		items,
		// selectedItem        :RHFValue,
		onSelectedItemChange: handleSelectedItemChange,
		// stateReducer        :stateReducer || defaultStateReducer,
		onInputValueChange: (
			onInputValueChangeFactory || defaultOnInputValueChangeFactory
		)(setItems),
		initialSelectedItem: convertValueToOption(RHFValue, options),
		itemToString: convertOptionToString,
	});

	const inputRef = useRef<HTMLInputElement>(null); // Create your own ref to manage focus

	const setCombinedRef = useCallback(
		(instance) => {
			RHFRef(instance);
			inputRef.current = instance;
		},
		[RHFRef, inputRef],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to run the effect if react-hook-form value changes only
	useEffect(() => {
		(async () => {
			if (RHFValue !== selectedItem?.[valueKey]) {
				const newItem = await convertValueToOption(RHFValue, options);
				selectItem(newItem);
			}
		})();
	}, [
		RHFValue,
		// valueKey,
		// convertValueToItem,
		// options,
	]);

	const resetAndFocusInput = useCallback(() => {
		onChange("");
		selectItem(undefined);
		inputRef.current?.focus();
		if (openOnReset) {
			openMenu();
		}
	}, [inputRef.current, selectItem, openOnReset, openMenu, onChange]);

	return (
		<div
			id={id}
			style={style}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
		>
			<input
				{...getInputProps({
					disabled,
					placeholder,
					onBlur,
					ref: setCombinedRef,
				})}
			/>
			<ResetButton onClick={resetAndFocusInput} />
			<List
				isOpen={isOpen}
				getMenuProps={getMenuProps}
				getItemProps={getItemProps}
				items={items}
				highlightedIndex={highlightedIndex}
				fieldValue={RHFValue}
				convertItemToString={convertItemToString}
				valueKey={valueKey}
			/>
		</div>
	);
};

export default SingleCombobox;
