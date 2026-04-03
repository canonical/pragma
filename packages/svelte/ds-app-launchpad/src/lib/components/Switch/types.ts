import type { HTMLInputAttributes } from "svelte/elements";

interface BaseProps
  extends Omit<
    HTMLInputAttributes,
    "children" | "role" | "indeterminate" | "aria-checked" | "aria-readonly"
  > {
  type?: "checkbox";
}

export interface CheckedControlledSwitchProps<T> extends BaseProps {
  value?: T;
  group?: never;
  checked?: boolean;
}

export interface GroupControlledSwitchProps<T> extends BaseProps {
  value: T;
  group: T[];
  checked?: never;
}

export type SwitchProps<T = BaseProps["value"]> =
  | CheckedControlledSwitchProps<T>
  | GroupControlledSwitchProps<T>;
