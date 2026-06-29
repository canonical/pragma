import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileUploadInput } from "./FileUploadInput.js";

// These tests render the presentational input with NO FormProvider, proving it
// is usable standalone (outside of a <Form>).
describe("FileUploadInput (presentational)", () => {
  it("renders the dropzone without a form context", () => {
    render(<FileUploadInput />);
    expect(
      screen.getByText("Drop files here or click to browse"),
    ).toBeInTheDocument();
  });

  it("applies the input chrome on the wrapping element", () => {
    const { container } = render(<FileUploadInput />);
    expect(
      container.querySelector(".ds.input.file-upload"),
    ).toBeInTheDocument();
  });

  it("renders a hidden file input", () => {
    const { container } = render(<FileUploadInput accept="image/*" multiple />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("accept", "image/*");
    expect(fileInput).toHaveAttribute("multiple");
  });

  it("calls onChange with a File[] when a file is selected", () => {
    const onChange = vi.fn();
    const { container } = render(<FileUploadInput onChange={onChange} />);
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0];
    expect(Array.isArray(emitted)).toBe(true);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toBeInstanceOf(File);
    expect(emitted[0].name).toBe("hello.txt");
  });

  it("renders the provided files in the list", () => {
    const file = new File(["hello"], "report.pdf", {
      type: "application/pdf",
    });
    render(<FileUploadInput value={[file]} />);
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove report.pdf" }),
    ).toBeInTheDocument();
  });

  it("supports the disabled state", () => {
    const { container } = render(<FileUploadInput disabled />);
    expect(
      screen.getByText("Drop files here or click to browse").closest("button"),
    ).toBeDisabled();
    expect(container.querySelector('input[type="file"]')).toBeDisabled();
  });
});
