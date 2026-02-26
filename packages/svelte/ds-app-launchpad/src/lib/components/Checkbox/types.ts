import type { HTMLInputAttributes } from "svelte/elements";

interface BaseProps extends Omit<HTMLInputAttributes, "children"> {
  type?: "checkbox";
}

export interface CheckedControlledCheckboxProps<T> extends BaseProps {
  value?: T;
  group?: never;
  checked?: boolean;
}

export interface GroupControlledCheckboxProps<T> extends BaseProps {
  value: T;
  group: T[];
  checked?: never;
}

export type CheckboxProps<T = BaseProps["value"]> =
  | CheckedControlledCheckboxProps<T>
  | GroupControlledCheckboxProps<T>;
