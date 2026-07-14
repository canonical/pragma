import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { FileUploadField } from "./index.js";

const file = (name: string, sizeBytes = 1): File => {
  const f = new File(["x".repeat(sizeBytes)], name);
  // jsdom's File may not honour content length for `size`; pin it explicitly.
  Object.defineProperty(f, "size", { value: sizeBytes });
  return f;
};

// Submitting is what runs RHF's `validate` rule; the file input is aria-hidden
// and drag-drop can't be simulated, so seed the value via defaultValues and fire
// a submit on the wrapping form.
const submit = () => {
  const form = document.querySelector("form");
  if (form) fireEvent.submit(form);
};

describe("FileUploadField", () => {
  it("registers with react-hook-form", () => {
    renderWithForm(<FileUploadField name="doc" label="Upload" />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
  });

  it("errors when more than maxFiles are selected", async () => {
    renderWithForm(
      <FileUploadField name="docs" label="Upload" multiple maxFiles={2} />,
      {
        formProps: {
          mode: "onSubmit",
          defaultValues: {
            docs: [file("a.txt"), file("b.txt"), file("c.txt")],
          },
        },
      },
    );
    submit();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "You can upload at most 2 files.",
      );
    });
  });

  it("errors when a file exceeds maxSize", async () => {
    renderWithForm(
      <FileUploadField name="docs" label="Upload" multiple maxSize={1024} />,
      {
        formProps: {
          mode: "onSubmit",
          defaultValues: { docs: [file("big.txt", 2048)] },
        },
      },
    );
    submit();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "big.txt exceeds 1 KB.",
      );
    });
  });

  it("does not error when within maxFiles and maxSize", async () => {
    renderWithForm(
      <FileUploadField
        name="docs"
        label="Upload"
        multiple
        maxFiles={2}
        maxSize={1024}
      />,
      {
        formProps: {
          mode: "onSubmit",
          defaultValues: { docs: [file("ok.txt", 512)] },
        },
      },
    );
    submit();
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
