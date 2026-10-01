import type { ComponentProps } from "react";

/**
 * Props for the presentational Switch input (no react-hook-form). Renders an
 * `<input>` as its root. `type` and `role` are fixed by the component
 * (`checkbox` / `switch`) and omitted here so a consumer cannot override the
 * switch semantics.
 */
export type SwitchInputProps = Omit<ComponentProps<"input">, "type" | "role">;
