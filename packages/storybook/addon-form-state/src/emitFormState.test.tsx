import { act, render } from "@testing-library/react";
import { type FieldValues, type UseFormReturn, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_FORM_STATE } from "./constants.js";
import { flattenErrors, useFormStateEmitter } from "./emitFormState.js";

const { emit } = vi.hoisted(() => ({ emit: vi.fn() }));

vi.mock("storybook/internal/preview-api", () => ({
  addons: {
    getChannel: () => ({ emit }),
  },
}));

interface EmittedFormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  dirtyFields: Record<string, boolean>;
  touchedFields: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

/** The payload of the most recent channel emission, asserting the event name. */
const lastEmission = (): EmittedFormState => {
  const call = emit.mock.calls.at(-1);
  if (!call) {
    throw new Error("nothing was emitted on the channel");
  }
  expect(call[0]).toBe(EVENT_FORM_STATE);
  return call[1] as EmittedFormState;
};

/** Mounts a form wired to the emitter and hands back its methods. */
const renderForm = (defaultValues: FieldValues): UseFormReturn<FieldValues> => {
  let methods: UseFormReturn<FieldValues> | undefined;
  const Harness = () => {
    methods = useForm<FieldValues>({ defaultValues });
    useFormStateEmitter(methods);
    return null;
  };
  render(<Harness />);
  if (!methods) {
    throw new Error("form harness did not render");
  }
  return methods;
};

describe("useFormStateEmitter", () => {
  beforeEach(() => {
    emit.mockClear();
  });

  it("emits the initial form state on the addon channel", () => {
    renderForm({ name: "Ada" });

    expect(emit).toHaveBeenCalled();
    expect(lastEmission()).toMatchObject({
      values: { name: "Ada" },
      errors: {},
      dirtyFields: {},
      touchedFields: {},
      isDirty: false,
      isSubmitting: false,
      submitCount: 0,
    });
  });

  it("emits updated values and dirty fields after a field change", () => {
    const methods = renderForm({ name: "" });

    act(() => {
      methods.setValue("name", "Grace", { shouldDirty: true });
    });

    const payload = lastEmission();
    expect(payload.values).toEqual({ name: "Grace" });
    expect(payload.dirtyFields).toEqual({ name: true });
    expect(payload.isDirty).toBe(true);
  });

  it("emits nested field errors flattened to dot paths", () => {
    const methods = renderForm({ user: { name: "" } });

    act(() => {
      methods.setError("user.name", {
        type: "manual",
        message: "Name is required",
      });
    });

    const payload = lastEmission();
    expect(payload.errors).toEqual({ "user.name": "Name is required" });
    expect(payload.isValid).toBe(false);
  });

  it("emits the incremented submit count once a submit settles", async () => {
    const methods = renderForm({ name: "Ada" });

    await act(async () => {
      await methods.handleSubmit(async () => {})();
    });

    const payload = lastEmission();
    expect(payload.submitCount).toBe(1);
    expect(payload.isSubmitting).toBe(false);
  });
});

describe("flattenErrors", () => {
  it("maps field errors to their message", () => {
    expect(
      flattenErrors({
        name: { type: "required", message: "Name is required" },
      }),
    ).toEqual({ name: "Name is required" });
  });

  it("builds dot-separated paths for nested errors", () => {
    expect(
      flattenErrors({
        user: {
          address: { city: { type: "required", message: "City is required" } },
        },
        name: { type: "min", message: "Too short" },
      }),
    ).toEqual({
      "user.address.city": "City is required",
      name: "Too short",
    });
  });

  it("stringifies a nullish message as an empty string", () => {
    expect(
      flattenErrors({
        missing: { type: "required", message: undefined },
        nullish: { type: "required", message: null },
      }),
    ).toEqual({ missing: "", nullish: "" });
  });

  it("does not recurse into ref-only objects", () => {
    expect(
      flattenErrors({
        name: { ref: { focus: () => {} } },
      }),
    ).toEqual({});
  });

  it("ignores primitive entries", () => {
    expect(
      flattenErrors({
        type: "server",
        name: { type: "required", message: "Broken" },
      }),
    ).toEqual({ name: "Broken" });
  });
});
