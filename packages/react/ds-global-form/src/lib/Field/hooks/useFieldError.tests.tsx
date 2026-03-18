import { renderHook } from "@testing-library/react";
import type React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import useFieldError from "./useFieldError.js";

function createWrapper(errors?: Record<string, { message: string }>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm({
      defaultValues: { email: "" },
      errors: errors
        ? Object.fromEntries(
            Object.entries(errors).map(([k, v]) => [
              k,
              { type: "manual", message: v.message },
            ]),
          )
        : undefined,
    });
    return <FormProvider {...methods}>{children}</FormProvider>;
  };
}

describe("useFieldError", () => {
  it("returns undefined when there are no errors", () => {
    const { result } = renderHook(() => useFieldError("email"), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeUndefined();
  });

  it("returns the error for a field with errors", () => {
    const { result } = renderHook(() => useFieldError("email"), {
      wrapper: createWrapper({ email: { message: "Required" } }),
    });
    expect(result.current).toBeDefined();
    expect(result.current?.message).toBe("Required");
  });
});
