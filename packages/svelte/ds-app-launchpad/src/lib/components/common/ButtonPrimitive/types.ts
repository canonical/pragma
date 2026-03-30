import type { Attachment } from "svelte/attachments";
import type {
  HTMLAnchorAttributes,
  HTMLButtonAttributes,
} from "svelte/elements";

interface BaseProps {
  ref?: HTMLElement;
  [key: symbol]: Attachment<HTMLElement> | false | undefined | null;
}

interface ButtonPrimitiveAnchorAttributes
  extends Omit<HTMLAnchorAttributes, "type" | "href" | keyof BaseProps>,
    BaseProps {
  href: HTMLAnchorAttributes["href"];
  type?: never;
  disabled?: HTMLButtonAttributes["disabled"];
}

interface ButtonPrimitiveButtonAttributes
  extends Omit<HTMLButtonAttributes, keyof BaseProps>,
    BaseProps {
  href?: never;
}

export type ButtonPrimitiveProps =
  | ButtonPrimitiveButtonAttributes
  | ButtonPrimitiveAnchorAttributes;
