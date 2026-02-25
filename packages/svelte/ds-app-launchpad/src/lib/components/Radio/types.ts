import type { HTMLInputAttributes } from "svelte/elements";

interface BaseProps extends Omit<
  HTMLInputAttributes,
  "children" | "indeterminate"
> {
  type?: "radio";
}

export interface CheckedControlledRadioProps<T> extends BaseProps {
  value?: T;
  group?: never;
  checked?: boolean;
}

export interface GroupControlledRadioProps<T> extends BaseProps {
  value: T;
  group: T | undefined;
  checked?: never;
}

export type RadioProps<T = BaseProps["value"]> =
  | CheckedControlledRadioProps<T>
  | GroupControlledRadioProps<T>;
