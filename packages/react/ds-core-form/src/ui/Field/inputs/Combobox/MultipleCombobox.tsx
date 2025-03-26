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
  convertValueToItem as defaultConvertValueToItem,
  filterItems as defaultFilterItems,
} from "./utils/index.js";
import "./styles.css";

const componentCssClassName = "ds form-combobox";

/**
 * A multiple-select combobox component that allows selecting multiple items.
 * Uses Downshift's useMultipleSelection and useCombobox hooks for state management.
 *
 * @param {ComboboxProps} props - The component props
 * @returns {React.ReactElement} - Rendered MultipleCombobox component
 */
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
  convertValueToItem = defaultConvertValueToItem,
  filterItems = defaultFilterItems,
  onInputValueChangeFactory,
}: ComboboxProps): React.ReactElement => {
  // State for selected items, input value, and filtered items
  const [selectedItems, setSelectedItems] = useState<Option[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [items, setItems] = useState(options);

  // React Hook Form integration
  const {
    field: { onChange, value: ReactHookFormValue },
  } = useController({
    name,
    rules: registerProps,
  });

  // Convert array of values to array of Option objects
  const convertValuesToItems = useCallback(
    (values: string[]) => {
      return values
        .map((val) => convertValueToItem(val, options, valueKey))
        .filter(Boolean) as Option[];
    },
    [convertValueToItem, options, valueKey],
  );

  // Initialize selectedItems from ReactHookFormValue on mount or when it changes
  useEffect(() => {
    if (ReactHookFormValue && ReactHookFormValue.length > 0) {
      const initialSelected = convertValuesToItems(ReactHookFormValue);
      setSelectedItems(initialSelected);
    }
  }, [ReactHookFormValue, convertValuesToItems]);

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
    selectItem,
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
    onChange(undefined);
  }, [onChange]);

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
            key={selectedItem[valueKey] as string}
            {...getSelectedItemProps({ selectedItem, index })}
            onClick={() => removeSelectedItem(selectedItem)}
            className="chip"
          >
            {convertItemToString(selectedItem)}
            <span className="remove-icon">×</span>
          </button>
        ))}
      </div>

      {/* Input field for searching and selecting */}
      <input
        {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* Reset button to clear selections */}
      <ResetButton onClick={resetSelection} />

      {/* Dropdown list of available options */}
      <List
        isOpen={isOpen}
        getMenuProps={getMenuProps}
        getItemProps={getItemProps}
        items={items}
        highlightedIndex={highlightedIndex}
        convertItemToString={convertItemToString}
        valueKey={valueKey}
        fieldValue={selectedItems.map((item) => item[valueKey]).join(", ")}
      />
    </div>
  );
};

export default MultipleCombobox;
