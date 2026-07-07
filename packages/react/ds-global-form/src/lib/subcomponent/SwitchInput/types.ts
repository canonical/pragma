import type React from "react";

/**
 * Props for the presentational Switch input (no react-hook-form). `type` and
 * `role` are fixed by the component (`checkbox` / `switch`) and omitted here so
 * a consumer cannot override the switch semantics.
 */
export type SwitchInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "role"
>;
