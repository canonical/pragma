import type { HTMLInputAttributes } from "svelte/elements";

interface BaseProps extends Omit<HTMLInputAttributes, "children"> {
  ref?: HTMLInputElement;
}

export interface TextInputPrimitiveProps extends BaseProps {
  // Accept text-like input types
  type?: "text" | "password" | "email" | "url" | "tel" | "search";
  value?: string;
}

export interface NumberInputPrimitiveProps extends BaseProps {
  type: "number";
  value?: number;
}

export type InputPrimitiveProps =
  | TextInputPrimitiveProps
  | NumberInputPrimitiveProps;
