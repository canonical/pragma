/* @canonical/generator-ds 0.9.0-experimental.9 */
import { type UseComboboxStateChange, useCombobox } from "downshift";
import { useCallback, useEffect, useRef, useState } from "react";
import { useController } from "react-hook-form";
import type { Option } from "../../types.js";
import { List, ResetButton } from "./common/index.js";
import { VALUE_KEY } from "./constants.js";
import type { ComboboxProps } from "./types.js";
import {
  convertItemToString as defaultConvertItemToString,
  convertValueToItem as defaultConvertValueToItem,
  filterItems as defaultFilterItems,
  mergeRefs,
} from "./utils/index.js";
import "./styles.css";
const componentCssClassName = "ds combobox";

/**
 * description of the SingleCombobox component
 * @returns {React.ReactElement} - Rendered SingleCombobox
 * DIsambiguation :
 * `Option` refers to the internal type of this library for inputs where a list of objects is presented. This type is common to several inputs, `Select`, `SimpleChoices` and this `Combobox`
 * `Item` represents the type of an Option casted internally to be compatible with Downshift. It also matches the downshift vocabulary
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
  convertItemToString = defaultConvertItemToString,
  convertValueToItem = defaultConvertValueToItem,
  filterItems = defaultFilterItems,
}: ComboboxProps): React.ReactElement => {
  const [items, setItems] = useState(options);

  const {
    field: {
      onChange,
      onBlur,
      ref: ReactHookFormRef,
      value: ReactHookFormValue,
    },
  } = useController({
    name,
    rules: registerProps,
  });

  const handleSelectedItemChange = useCallback(
    (changes: UseComboboxStateChange<Option>) => {
      onChange(changes.selectedItem?.[valueKey] || undefined);
    },
    [onChange, valueKey],
  );

  /* This allows for the option logic to be controlled externally, for instance by a backend
   * For simpler use cases, simply pass a custom filterItems function */
  const defaultOnInputValueChangeFactory =
    (stateUpdater: React.Dispatch<React.SetStateAction<Option[]>>) =>
    ({ inputValue }: { inputValue: string }) =>
      stateUpdater(filterItems(options, inputValue));

  const onInputValueChange = onInputValueChangeFactory
    ? onInputValueChangeFactory(setItems)
    : defaultOnInputValueChangeFactory(setItems);

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
    // setInputValue,
    highlightedIndex,
    getItemProps,
  } = useCombobox({
    items,
    // selectedItem        :ReactHookFormValue,
    onSelectedItemChange: handleSelectedItemChange,
    // stateReducer        :stateReducer || defaultStateReducer,
    onInputValueChange,
    initialSelectedItem: convertValueToItem(ReactHookFormValue, options),
    itemToString: convertItemToString,
  });

  const inputRef = useRef<HTMLInputElement>(null); // Create your own ref to manage focus

  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to run the effect if react-hook-form value changes only
  useEffect(() => {
    (async () => {
      if (ReactHookFormValue !== selectedItem?.[valueKey]) {
        const newItem = await convertValueToItem(ReactHookFormValue, options);
        selectItem(newItem);
      }
    })();
  }, [
    ReactHookFormValue,
    // valueKey,
    // convertValueToItem,
    // options,
  ]);

  const resetAndFocusInput = useCallback(() => {
    onChange(undefined); // Consistent with handleSelectedItemChange
    selectItem(null);
    inputRef.current?.focus();
    if (openOnReset) {
      openMenu();
    }
  }, [selectItem, openOnReset, openMenu, onChange]);

  const combinedRef = mergeRefs(inputRef, ReactHookFormRef);

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
          ref: combinedRef,
        })}
      />
      <ResetButton onClick={resetAndFocusInput} />
      <List
        isOpen={isOpen}
        getMenuProps={getMenuProps}
        getItemProps={getItemProps}
        items={items}
        highlightedIndex={highlightedIndex}
        fieldValue={ReactHookFormValue}
        convertItemToString={convertItemToString}
        valueKey={valueKey}
      />
    </div>
  );
};

export default SingleCombobox;
