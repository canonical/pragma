/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Provider from "../../Provider.js";
import * as fixtures from "../../fixtures.js";
import Component from "./FileHeader.js";

describe("FileHeader component", () => {
  it("applies className correctly", () => {
    const { container } = render(
      <Provider diff={fixtures.diffExample}>
        <Component className="test-class" />
      </Provider>,
    );
    expect(container.firstChild?.firstChild).toHaveClass("test-class");
  });

  it("shows the file path", () => {
    render(
      <Provider diff={fixtures.diffExample}>
        <Component />
      </Provider>,
    );
    expect(
      screen.getByText("src/components/FileTree/FileItem.module.scss"),
    ).toBeDefined();
  });

  it("shows the collapse button", () => {
    render(
      <Provider
        diff={fixtures.diffExample}
        isCollapsed={false}
        onCollapseToggle={() => {}}
      >
        <Component />
      </Provider>,
    );
    expect(screen.getByLabelText("Collapse file")).toBeDefined();
  });

  it("hides the collapse button when disabled", () => {
    render(
      <Provider
        diff={fixtures.diffExample}
        isCollapsed={false}
        onCollapseToggle={() => {}}
      >
        <Component hideCollapse />
      </Provider>,
    );
    expect(screen.queryByLabelText("Collapse file")).toBeNull();
  });

  it("hides the collapse button when collapse option is not available", () => {
    render(
      <Provider diff={fixtures.diffExample}>
        <Component />
      </Provider>,
    );
    expect(screen.queryByLabelText("Collapse file")).toBeNull();
  });
});
