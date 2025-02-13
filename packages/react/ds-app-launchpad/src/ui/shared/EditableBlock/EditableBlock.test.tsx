/* @canonical/generator-ds 0.8.0-experimental.0 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EditableBlock from "./EditableBlock.js";

describe("EditableBlock component", () => {
  it("renders children content", () => {
    render(<EditableBlock title={"Hello world!"}>EditableBlock</EditableBlock>);
    expect(screen.getByText("EditableBlock")).toBeInTheDocument();
  });

  it("toggles editing state when icon is clicked", () => {
    render(<EditableBlock title={"Hello world!"}>Content</EditableBlock>);
    const editIcon = screen.getByRole("button");
    fireEvent.click(editIcon);
    expect(editIcon).toHaveClass("editable-block-component__icon--close");
    fireEvent.click(editIcon);
    expect(editIcon).toHaveClass("editable-block-component__icon--edit");
  });
});
