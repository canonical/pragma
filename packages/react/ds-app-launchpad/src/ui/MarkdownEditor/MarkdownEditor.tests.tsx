/* @canonical/generator-ds 0.9.0-experimental.4 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import * as fixtures from "./fixtures.js";
import MarkdownEditor from "./MarkdownEditor.js";

describe("MarkdownEditor", () => {
  it("renders correctly with default props", () => {
    render(<MarkdownEditor />);

    // Editor should be visible
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    // Toolbar should be visible by default
    expect(screen.getByLabelText("Markdown Editor")).toBeInTheDocument();
  });

  it("switches between write and preview modes", async () => {
    const { container } = render(
      <MarkdownEditor defaultValue={fixtures.markdownLongExample} />,
    );

    // Initially in write mode
    expect(screen.getByRole("textbox")).toBeVisible();

    // Find and click the preview tab
    const tabs = screen.getAllByRole("tab");
    const previewTab = tabs.find((tab) => tab.textContent?.includes("Preview"));
    expect(previewTab).toBeDefined();
    if (!previewTab) return;

    fireEvent.click(previewTab);

    // Textarea should be hidden in preview mode
    await waitFor(() => {
      expect(container.querySelector("textarea")).not.toBeVisible();
    });

    // Switch back to write mode
    const writeTab = tabs.find((tab) => tab.textContent?.includes("Write"));
    expect(writeTab).toBeDefined();
    if (!writeTab) return;

    fireEvent.click(writeTab);
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeVisible();
    });
  });

  it("hides toolbar when hideToolbar is true", () => {
    render(<MarkdownEditor hideToolbar />);

    expect(screen.queryByLabelText("Markdown Editor")).not.toBeInTheDocument();
  });

  it("hides preview when hidePreview is true", () => {
    render(<MarkdownEditor hidePreview />);

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("forwards ref to textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<MarkdownEditor ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("works as a controlled component", async () => {
    const handleEditModeChange = vi.fn();

    render(
      <MarkdownEditor
        editMode="write"
        onEditModeChange={handleEditModeChange}
      />,
    );

    // Find and click the preview tab
    const tabs = screen.getAllByRole("tab");
    const previewTab = tabs.find((tab) => tab.textContent?.includes("Preview"));
    expect(previewTab).toBeDefined();
    if (!previewTab) return;
    fireEvent.click(previewTab);

    // Handler should be called with new mode
    await waitFor(() => {
      expect(handleEditModeChange).toHaveBeenCalledWith("preview");
    });
  });

  it("shows a checkbox to switch between write and preview modes", () => {
    render(<MarkdownEditor previewSwitchMode="checkbox" />);

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });
});
