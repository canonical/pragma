import { useCombobox, useMultipleSelection } from "downshift";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { Option } from "../types.js";
import { List, ResetButton } from "./common/index.js";
import { VALUE_KEY } from "./constants.js";
import type { ComboboxInputProps } from "./types.js";
import {
  convertItemToString as defaultConvertItemToString,
  convertValueToItem as defaultConvertValueToItem,
  filterItems as defaultFilterItems,
} from "./utils/index.js";
import "./styles.css";

const componentCssClassName = "ds form-combobox";

/**
 * Multiple-select combobox (presentational, controlled — no react-hook-form).
 * Selected values are rendered as removable chips. Uses downshift's
 * useMultipleSelection + useCombobox.
 *
 * @param {ComboboxInputProps} props - The component props
 * @returns {React.ReactElement} - Rendered MultipleCombobox component
 *
 * `import { MultipleCombobox } from "@canonical/react-ds-global-form";`
 */
const MultipleCombobox = ({
  id,
  className,
  style,
  options,
  value,
  onChange,
  disabled = false,
  placeholder,
  valueKey = VALUE_KEY,
  convertItemToString = defaultConvertItemToString,
  convertValueToItem = defaultConvertValueToItem,
  filterItems = defaultFilterItems,
  onInputValueChangeFactory,
}: ComboboxInputProps): React.ReactElement => {
  // State for selected items and filtered items
  const [selectedItems, setSelectedItems] = useState<Option[]>([]);
  const [items, setItems] = useState(options);

  // Convert array of values to array of Option objects
  const convertValuesToItems = useCallback(
    (values: string[]) => {
      return values
        .map((val) => convertValueToItem(val, options, valueKey))
        .filter(Boolean) as Option[];
    },
    [convertValueToItem, options, valueKey],
  );

  // Initialise selectedItems from the controlled value on mount / when it changes
  useEffect(() => {
    const values = value as string[] | undefined;
    if (values && values.length > 0) {
      setSelectedItems(convertValuesToItems(values));
    }
  }, [value, convertValuesToItems]);

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
        onChange?.(newValue.length > 0 ? (newValue as string[]) : undefined);
      }
    },
  });

  // Default onInputValueChangeFactory: filters items locally
  const defaultOnInputValueChangeFactory = useCallback(
    () =>
      ({ inputValue }: { inputValue: string }) => {
        setItems(filterItems(options, inputValue));
      },
    [filterItems, options],
  );

  // Use provided onInputValueChangeFactory or default
  const onInputValueChange = onInputValueChangeFactory
    ? onInputValueChangeFactory(setItems)
    : defaultOnInputValueChangeFactory();

  // Downshift's useCombobox hook for combobox functionality
  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
    setInputValue, // Function to set input value
  } = useCombobox({
    items,
    onInputValueChange,
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
    onChange?.(undefined);
  }, [onChange, setInputValue]);

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {/* Selected items displayed as chips */}
      <div className="selected-items">
        {selectedItems.map((selectedItem, index) => (
          <button
            key={String(selectedItem[valueKey])}
            {...getSelectedItemProps({ selectedItem, index })}
            onClick={() => removeSelectedItem(selectedItem)}
            className="chip"
          >
            {convertItemToString(selectedItem)}
            <span className="remove-icon">×</span>
          </button>
        ))}
      </div>

      {/* Input field with reset button in chrome wrapper */}
      <div className="ds input combobox-input chrome">
        <input
          className="p"
          {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
          placeholder={placeholder}
          disabled={disabled}
        />
        <ResetButton onClick={resetSelection} />
      </div>

      {/* Dropdown list of available options */}
      <List
        isOpen={isOpen}
        getMenuProps={getMenuProps}
        getItemProps={getItemProps}
        items={items}
        highlightedIndex={highlightedIndex}
        convertItemToString={convertItemToString}
        valueKey={valueKey}
        fieldValue={selectedItems.map((item) => String(item[valueKey]))}
      />
    </div>
  );
};

export default MultipleCombobox;
