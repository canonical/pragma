import type { ComponentProps, ReactNode } from "react";

type DateTimeBaseOwnProps = {
  /** Machine-readable `<time datetime>`. */
  iso: string;
  children: ReactNode;
  /** Alternate-format text, shown in the tooltip. */
  alternate: ReactNode;
  /** Default true. */
  showTooltip?: boolean;
};

/** Toggle-variant props: the root is a `<button>` toggling the format. */
type DateTimeToggleOwnProps = DateTimeBaseOwnProps & {
  toggleable: true;
  onToggle: () => void;
  /** Drives `aria-pressed`. */
  pressed?: boolean;
};

/** Static-variant props: the root is a plain `<time>`. */
export type DateTimeStaticOwnProps = DateTimeBaseOwnProps & {
  toggleable?: false;
};

/** Props for the toggle variant, extending `ComponentProps<"button">`. */
export type DateTimeToggleProps = DateTimeToggleOwnProps &
  Omit<ComponentProps<"button">, keyof DateTimeToggleOwnProps>;

/** Props for the static variant, extending `ComponentProps<"time">`. */
export type DateTimeStaticProps = DateTimeStaticOwnProps &
  Omit<ComponentProps<"time">, keyof DateTimeStaticOwnProps>;

/** Timeline.DateTime — variable-root component (button or time). */
export type DateTimeProps = DateTimeToggleProps | DateTimeStaticProps;
