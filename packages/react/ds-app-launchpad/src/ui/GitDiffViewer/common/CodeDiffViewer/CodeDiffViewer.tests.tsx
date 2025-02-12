/* @canonical/generator-canonical-ds 0.0.1 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as fixtures from "../../Provider.fixtures.js";
import Provider from "../../Provider.js";
import Component from "./CodeDiffViewer.js";

describe("CodeDiffViewer component", () => {
  it("renders without crashing", () => {
    render(
      <Provider diff={fixtures.diffExample}>
        <Component />
      </Provider>,
    );
    expect(
      screen.getByText(fixtures.diffExample.hunks[0].header),
    ).toBeDefined();
  });

  it("applies className correctly", () => {
    const { container } = render(
      <Provider diff={fixtures.diffExample}>
        <Component className="test-class" />
      </Provider>,
    );
    expect(container.firstChild?.firstChild).toHaveClass("test-class");
  });
});
