import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { RangeField } from "./index.js";

describe("RangeField", () => {
  it("renders a canonical number input as the labelled control", () => {
    renderWithForm(
      <RangeField name="volume" label="Volume" min={0} max={100} />,
    );
    const number = screen.getByLabelText("Volume");
    expect(number).toHaveAttribute("type", "number");
    expect(number).toHaveAttribute("name", "volume");
  });

  it("renders a mirroring slider with its own aria-label (no name)", () => {
    renderWithForm(
      <RangeField name="volume" label="Volume" min={0} max={100} />,
    );
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-label");
    // The slider must NOT carry the field name (it would double-submit).
    expect(slider).not.toHaveAttribute("name");
  });

  it("derives the slider aria-label from the field name when none is given", () => {
    renderWithForm(
      <RangeField name="volume" label="Volume" min={0} max={100} />,
    );
    // A generic "Slider" would make every RangeField's slider indistinguishable
    // to assistive tech; the default is field-specific.
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-label",
      "volume (slider)",
    );
  });

  it("forwards min/max/step to both controls", () => {
    renderWithForm(
      <RangeField name="volume" label="Volume" min={0} max={100} step={5} />,
    );
    for (const control of [
      screen.getByLabelText("Volume"),
      screen.getByRole("slider"),
    ]) {
      expect(control).toHaveAttribute("min", "0");
      expect(control).toHaveAttribute("max", "100");
      expect(control).toHaveAttribute("step", "5");
    }
  });

  it("syncs slider → number (write-through) and registers a number", async () => {
    const onSubmit = vi.fn();
    function Host() {
      const methods = useForm();
      return (
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <RangeField name="volume" label="Volume" min={0} max={100} />
            <button type="submit">submit</button>
          </form>
        </FormProvider>
      );
    }
    // Host already provides its own FormProvider + <form>, so render plainly
    // rather than double-wrapping with renderWithForm.
    render(<Host />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "42" } });
    // The number input mirrors the slider.
    expect(screen.getByLabelText("Volume")).toHaveValue(42);
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const submitted = onSubmit.mock.calls[0][0] as { volume: unknown };
    expect(submitted.volume).toBe(42);
    expect(typeof submitted.volume).toBe("number");
  });

  it("syncs number → slider", () => {
    renderWithForm(
      <RangeField name="volume" label="Volume" min={0} max={100} />,
    );
    fireEvent.change(screen.getByLabelText("Volume"), {
      target: { value: "73" },
    });
    expect(screen.getByRole("slider")).toHaveValue("73");
  });
});
