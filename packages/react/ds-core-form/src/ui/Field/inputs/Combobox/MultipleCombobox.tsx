import { useCombobox, useMultipleSelection } from "downshift";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useController } from "react-hook-form";
import type { Option } from "../../types.js";
import { List, ResetButton } from "./common/index.js";
import { VALUE_KEY } from "./constants.js";
import type { ComboboxProps } from "./types.js";
import {
	convertItemToString as defaultConvertItemToString,
	filterItems as defaultFilterItems,
} from "./utils/index.js";
import "./styles.css";

const componentCssClassName = "ds form-combobox";

const MultipleCombobox = ({
	id,
	className,
	style,
	registerProps,
	options,
	name,
	disabled = false,
	placeholder,
	valueKey = VALUE_KEY,
	convertItemToString = defaultConvertItemToString,
	filterItems = defaultFilterItems,
}: ComboboxProps): React.ReactElement => {
	// State for selected items and input value
	const [selectedItems, setSelectedItems] = useState<Option[]>([]);
	const [inputValue, setInputValue] = useState("");

	// React Hook Form integration
	const {
		field: { onChange, value: ReactHookFormValue },
	} = useController({
		name,
		rules: registerProps,
	});

	// Initialize selectedItems from ReactHookFormValue on mount
	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to run the effect if react-hook-form value changes only
	useEffect(() => {
		if (ReactHookFormValue && ReactHookFormValue.length > 0) {
			const initialSelected = ReactHookFormValue.map((val: string) =>
				// Todo : use a custom function to convert value to item
				options.find((opt) => opt[valueKey] === val),
			).filter(Boolean) as Option[];

			// Only update if the current selectedItems differ
			if (
				JSON.stringify(initialSelected.map((item) => item[valueKey])) !==
				JSON.stringify(selectedItems.map((item) => item[valueKey]))
			) {
				setSelectedItems(initialSelected);
			}
		}
		// Dependency on ReactHookFormValue ensures it reflects form changes
	}, [ReactHookFormValue, options, valueKey]);

	// Downshift's useMultipleSelection hook for managing multiple selections
	const {
		getSelectedItemProps,
		getDropdownProps,
		addSelectedItem,
		removeSelectedItem,
	} = useMultipleSelection({
		selectedItems,
		onSelectedItemsChange: ({ selectedItems: newSelectedItems }) => {
			if (newSelectedItems) {
				setSelectedItems(newSelectedItems);
				const newValue = newSelectedItems.map((item) => item[valueKey]);
				onChange(newValue.length > 0 ? newValue : undefined);
			}
		},
	});

	// Downshift's useCombobox hook for combobox functionality
	const {
		isOpen,
		getMenuProps,
		getInputProps,
		getItemProps,
		highlightedIndex,
		selectItem,
	} = useCombobox({
		items: filterItems(options, inputValue),
		onInputValueChange: ({ inputValue: newInputValue }) =>
			setInputValue(newInputValue || ""),
		onSelectedItemChange: ({ selectedItem }) => {
			if (
				selectedItem &&
				!selectedItems.some((item) => item[valueKey] === selectedItem[valueKey])
			) {
				addSelectedItem(selectedItem);
				setInputValue(""); // Clear input after selection
			}
		},
		itemToString: convertItemToString,
	});

	// Reset function to clear selections and input
	const resetSelection = useCallback(() => {
		setSelectedItems([]);
		setInputValue("");
		onChange(undefined);
	}, [onChange]);

	return (
		<div
			id={id}
			style={style}
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
		>
			<div className="selected-items">
				{selectedItems.map((selectedItem, index) => (
					<button
						key={selectedItem[valueKey]}
						{...getSelectedItemProps({ selectedItem, index })}
						onClick={() => removeSelectedItem(selectedItem)}
						className="chip"
						type="button"
					>
						{convertItemToString(selectedItem)}
						<span className="remove-icon">×</span>
					</button>
				))}
			</div>

			<input
				{...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
				placeholder={placeholder}
				disabled={disabled}
			/>

			<ResetButton onClick={resetSelection} />

			<List
				isOpen={isOpen}
				getMenuProps={getMenuProps}
				getItemProps={getItemProps}
				items={filterItems(options, inputValue)}
				highlightedIndex={highlightedIndex}
				convertItemToString={convertItemToString}
				valueKey={valueKey}
				fieldValue={selectedItems.map((item) => item[valueKey]).join(", ")}
			/>
		</div>
	);
};

export default MultipleCombobox;
