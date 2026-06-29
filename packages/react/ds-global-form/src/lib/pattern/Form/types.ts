/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { UseFormProps, UseFormReturn } from "react-hook-form";

export interface FormProps {
  /* A unique identifier for the Form */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  /* Callback invoked with form data on successful submission */
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  /* Externally managed useForm return value. When provided, Form wraps these methods in FormProvider without calling useForm internally. */
  methods?: UseFormReturn;
  /* Default field values. Ignored when methods is provided. */
  defaultValues?: UseFormProps["defaultValues"];
  /* Validation trigger mode. Ignored when methods is provided. */
  mode?: UseFormProps["mode"];
}
