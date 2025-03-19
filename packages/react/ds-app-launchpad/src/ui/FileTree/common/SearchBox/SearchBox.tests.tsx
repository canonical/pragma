/* @canonical/generator-ds 0.9.0-experimental.4 */

import { fireEvent, render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FileTree } from "../../index.js";

describe("SearchBox component", () => {
  it("renders null when onSearch is not provided", () => {
    const { container } = render(
      <FileTree>
        <FileTree.SearchBox />
      </FileTree>,
    );
    expect(container.querySelector(".ds.search-box")).toBeNull();
  });

  it("renders the search input with correct props and styles", () => {
    const onSearchMock = vi.fn();
    const { container } = render(
      <FileTree searchQuery="initialValue" onSearch={onSearchMock}>
        <FileTree.SearchBox
          id="search-box"
          className="test-class"
          style={{ color: "#333" }}
        />
      </FileTree>,
    );

    const form = container.querySelector("form");
    expect(form).toBeDefined();
    if (!form) return;
    expect(form).toHaveAttribute("id", "search-box");
    expect(form).toHaveClass("test-class");
    expect(form).toHaveStyle({ color: "#333" });

    const input = container.querySelector("input[name=search]");
    expect(input).toBeDefined();
    expect(input).toHaveAttribute("name", "search");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("required");
    expect(input).toHaveValue("initialValue");
  });

  it("calls onSearch with the search query while typing", async () => {
    const onSearchMock = vi.fn();
    const ControlledSearchBox = () => {
      const [search, setSearch] = useState("");

      const onSearch = (value: string) => {
        setSearch(value);
        onSearchMock(value);
      };

      return (
        <FileTree searchQuery={search} onSearch={onSearch}>
          <FileTree.SearchBox />
        </FileTree>
      );
    };

    const { container } = render(<ControlledSearchBox />);

    const form = container.querySelector("form");
    const input = container.querySelector("input[name=search]");
    expect(form).toBeDefined();
    expect(input).toBeDefined();
    if (!form || !input) return;

    await userEvent.type(input, "search-query");
    expect(onSearchMock).toHaveBeenCalledWith("search-query");
  });

  it("calls onSearch with the search query when the form is submitted", async () => {
    const onSearchMock = vi.fn();
    const ControlledSearchBox = () => {
      const [search, setSearch] = useState("");

      const onSearch = (value: string) => {
        setSearch(value);
        onSearchMock(value);
      };

      return (
        <FileTree searchQuery={search} onSearch={onSearch}>
          <FileTree.SearchBox />
        </FileTree>
      );
    };

    const { container } = render(<ControlledSearchBox />);
    const form = container.querySelector("form");
    const input = container.querySelector("input[name=search]");
    expect(form).toBeDefined();
    expect(input).toBeDefined();
    if (!form || !input) return;

    await userEvent.type(input, "search-query");
    fireEvent.submit(form);
    expect(onSearchMock).toHaveBeenCalledWith("search-query");
  });

  it("cleans the search query when the form is reset", async () => {
    const onSearchMock = vi.fn();
    const ControlledSearchBox = () => {
      const [search, setSearch] = useState("");

      const onSearch = (value: string) => {
        setSearch(value);
        onSearchMock(value);
      };

      return (
        <FileTree searchQuery={search} onSearch={onSearch}>
          <FileTree.SearchBox />
        </FileTree>
      );
    };

    const { container } = render(<ControlledSearchBox />);
    const form = container.querySelector("form");
    const input = container.querySelector("input[name=search]");
    expect(form).toBeDefined();
    expect(input).toBeDefined();
    if (!form || !input) return;

    await userEvent.type(input, "search-query");
    fireEvent.reset(form);
    expect(onSearchMock).toHaveBeenCalledWith("");
  });
});
