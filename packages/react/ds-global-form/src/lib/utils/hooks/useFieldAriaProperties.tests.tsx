import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useFieldAriaProperties from "./useFieldAriaProperties.js";

describe("useFieldAriaProperties", () => {
  it("returns consistent IDs for a given name", () => {
    const { result } = renderHook(() => useFieldAriaProperties("email", false));
    const { input, label, description } = result.current;

    expect(label.htmlFor).toBe(input.id);
    expect(input["aria-labelledby"]).toBe(label.id);
    expect(input["aria-describedby"]).toBe(description.id);
  });

  it("includes error ID in aria-describedby when isError is true", () => {
    const { result } = renderHook(() => useFieldAriaProperties("email", true));
    const { input, description, error } = result.current;

    expect(input["aria-describedby"]).toContain(description.id);
    expect(input["aria-describedby"]).toContain(error.id);
    expect(input["aria-errormessage"]).toBe(error.id);
    expect(input["aria-invalid"]).toBe(true);
  });

  it("omits error references when isError is false", () => {
    const { result } = renderHook(() => useFieldAriaProperties("email", false));
    const { input, error } = result.current;

    expect(input["aria-describedby"]).not.toContain(error.id);
    expect(input["aria-errormessage"]).toBeUndefined();
    expect(input["aria-invalid"]).toBe(false);
  });

  it("sets aria-required from the required flag, independent of error state", () => {
    // Required but not (yet) in error — aria-required must still be true.
    const { result: required } = renderHook(() =>
      useFieldAriaProperties("email", false, true),
    );
    expect(required.current.input["aria-required"]).toBe(true);

    // Not required — aria-required is omitted (undefined), not false.
    const { result: optional } = renderHook(() =>
      useFieldAriaProperties("email", true, false),
    );
    expect(optional.current.input["aria-required"]).toBeUndefined();
  });

  it("generates different IDs for different field names", () => {
    const { result: r1 } = renderHook(() =>
      useFieldAriaProperties("email", false),
    );
    const { result: r2 } = renderHook(() =>
      useFieldAriaProperties("name", false),
    );

    expect(r1.current.input.id).not.toBe(r2.current.input.id);
  });
});
