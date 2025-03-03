/* @canonical/generator-ds 0.8.0-experimental.0 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EditableBlock, { useEditing } from "./EditableBlock.js";

const SampleEditComponent = () => {
  return <div>Sample</div>;
};

describe("EditableBlock component", () => {
  it("renders children content", () => {
    render(
      <EditableBlock
        title={"Hello world!"}
        EditComponent={SampleEditComponent}
      />,
    );
    expect(screen.getByText("Sample")).toBeInTheDocument();
  });

  it("toggles editing state when icon is clicked", () => {
    render(
      <EditableBlock
        title={"Hello world!"}
        EditComponent={SampleEditComponent}
      />,
    );
    const editIcon = screen.getByRole("button");
    fireEvent.click(editIcon);
    expect(editIcon.classList.contains("icon-close")).toBe(true);
    fireEvent.click(editIcon);
    expect(editIcon.classList.contains("icon-edit")).toBe(true);
  });

  it("toggles editing state when Enter key is pressed", () => {
    render(
      <EditableBlock
        title={"Hello world!"}
        EditComponent={SampleEditComponent}
      />,
    );
    const editIcon = screen.getByRole("button");
    fireEvent.keyUp(editIcon, { key: "Enter", code: "Enter", charCode: 13 });
    expect(editIcon.classList.contains("icon-close")).toBe(true);
    fireEvent.keyUp(editIcon, { key: "Enter", code: "Enter", charCode: 13 });
    expect(editIcon.classList.contains("icon-edit")).toBe(true);
  });

  it("toggles editing state when Space key is pressed", () => {
    render(
      <EditableBlock
        title={"Hello world!"}
        EditComponent={SampleEditComponent}
      />,
    );
    const editIcon = screen.getByRole("button");
    fireEvent.keyUp(editIcon, { key: " ", code: "Space", charCode: 32 });
    expect(editIcon.classList.contains("icon-close")).toBe(true);
    fireEvent.keyUp(editIcon, { key: " ", code: "Space", charCode: 32 });
    expect(editIcon.classList.contains("icon-edit")).toBe(true);
  });

  it("provides editing context to children", () => {
    const ChildComponent = () => {
      const { isEditing } = useEditing();
      return <div>{isEditing ? "Editing" : "Not Editing"}</div>;
    };

    render(
      <EditableBlock title={"Hello world!"} EditComponent={ChildComponent} />,
    );

    const notEditingElement = screen.getByText("Not Editing");
    expect(notEditingElement).not.toBeNull();
    expect(document.body.contains(notEditingElement)).toBe(true);
    const editIcon = screen.getByRole("button");
    fireEvent.click(editIcon);
    const editingElement = screen.getByText("Editing");
    expect(editingElement).not.toBeNull();
    expect(document.body.contains(editingElement)).toBe(true);
  });
});
