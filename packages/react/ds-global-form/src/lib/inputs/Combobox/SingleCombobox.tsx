/* @canonical/generator-ds 0.9.0-experimental.9 */
import { type UseComboboxStateChange, useCombobox } from "downshift";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { Option } from "../types.js";
import { List, ResetButton } from "./common/index.js";
import { VALUE_KEY } from "./constants.js";
import type { ComboboxPresentationProps } from "./types.js";
import {
  convertItemToString as defaultConvertItemToString,
  convertValueToItem as defaultConvertValueToItem,
  filterItems as defaultFilterItems,
  mergeRefs,
} from "./utils/index.js";
import "./styles.css";
const componentCssClassName = "ds form-combobox";

/**
 * Single-select combobox (presentational, controlled — no react-hook-form).
 *
 * Disambiguation:
 * - `Option` is this library's option type, common to Select/SimpleChoices/Combobox.
 * - `Item` is the downshift-cast form of an Option.
 *
 * The forwarded ref (the field's ref when bound) is merged with the internal
 * input ref so focus management still works.
 */
export const SingleCombobox = forwardRef<
  HTMLInputElement,
  ComboboxPresentationProps
>(function SingleCombobox(
  {
    id,
    className,
    style,
    options,
    value,
    onChange,
    onBlur,
    disabled = false,
    openOnReset = false,
    onInputValueChangeFactory,
    placeholder,
    valueKey = VALUE_KEY,
    convertItemToString = defaultConvertItemToString,
    convertValueToItem = defaultConvertValueToItem,
    filterItems = defaultFilterItems,
  },
  fieldRef,
) {
  const [items, setItems] = useState(options);
  const currentValue = value as string | undefined;

  const handleSelectedItemChange = useCallback(
    (changes: UseComboboxStateChange<Option>) => {
      onChange?.(
        (changes.selectedItem?.[valueKey] as string | undefined) || undefined,
      );
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
    openMenu,
    selectItem,
    selectedItem,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
  } = useCombobox({
    items,
    onSelectedItemChange: handleSelectedItemChange,
    onInputValueChange,
    initialSelectedItem: convertValueToItem(currentValue as string, options),
    itemToString: convertItemToString,
  });

  const inputRef = useRef<HTMLInputElement>(null); // Own ref to manage focus

  // biome-ignore lint/correctness/useExhaustiveDependencies: run the effect only when the field value changes
  useEffect(() => {
    (async () => {
      if (currentValue !== selectedItem?.[valueKey]) {
        const newItem = await convertValueToItem(
          currentValue as string,
          options,
        );
        selectItem(newItem);
      }
    })();
  }, [currentValue]);

  const resetAndFocusInput = useCallback(() => {
    onChange?.(undefined); // Consistent with handleSelectedItemChange
    selectItem(null);
    inputRef.current?.focus();
    if (openOnReset) {
      openMenu();
    }
  }, [selectItem, openOnReset, openMenu, onChange]);

  const combinedRef = mergeRefs(inputRef, fieldRef ?? undefined);

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <div className="ds input combobox-input chrome">
        <input
          className="p"
          {...getInputProps({
            disabled,
            placeholder,
            onBlur,
            ref: combinedRef,
          })}
        />
        <ResetButton onClick={resetAndFocusInput} />
      </div>
      <List
        isOpen={isOpen}
        getMenuProps={getMenuProps}
        getItemProps={getItemProps}
        items={items}
        highlightedIndex={highlightedIndex}
        fieldValue={currentValue}
        convertItemToString={convertItemToString}
        valueKey={valueKey}
      />
    </div>
  );
});

export default SingleCombobox;
