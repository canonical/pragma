/**
 * Regression: submitting a refused name again asks the collection again.
 *
 * Before the fix, the refusal set as the input's validity stood until the
 * name was edited, and the browser checks validity before the form submits,
 * so the same name resubmitted — after another tab had renamed the view it
 * clashed with — never reached the collection: the stale refusal was shown
 * again instead.
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NameForm } from "../../lib/_work_in_progress/DataViews/common/SavedViews/common/index.js";

afterEach(cleanup);

describe("regression 0005 — a refused name was not asked again", () => {
  it("clears the standing refusal as the submit begins, so the name is checked anew", async () => {
    const onSubmit = vi
      .fn<(name: string) => Promise<string | null>>()
      .mockResolvedValueOnce('A view named "Failed" already exists.')
      .mockResolvedValue(null);
    render(
      <NameForm
        label="Save as a new view"
        submit="Save view"
        initial=""
        pending={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const name = screen.getByRole<HTMLInputElement>("textbox", {
      name: "Name",
    });
    const save = screen.getByRole("button", { name: "Save view" });
    const reported = vi.fn();
    name.addEventListener("invalid", reported);
    // An empty name never reaches the collection: the browser refuses it.
    fireEvent.click(save);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(reported).toHaveBeenCalledTimes(1);
    fireEvent.change(name, { target: { value: "failed" } });
    // Submitted from the button, the focus is there; a refusal brings it
    // back to the name.
    save.focus();
    fireEvent.click(save);
    await waitFor(() => {
      expect(name.validationMessage).toBe(
        'A view named "Failed" already exists.',
      );
    });
    expect(name).toHaveFocus();
    // The refusal was reported through the browser's own channel too.
    expect(reported).toHaveBeenCalledTimes(2);
    // The other tab renamed the clashing view; the same name is tried again.
    fireEvent.click(save);
    expect(name).toBeValid();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
    expect(onSubmit).toHaveBeenLastCalledWith("failed");
  });
});
