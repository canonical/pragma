import { render, screen } from "@testing-library/react";
import { useContext } from "react";
import { describe, expect, it } from "vitest";
import HeadContext from "./Context.js";
import HeadProvider from "./Provider.js";

/** Declared at module scope, which is what the provider's docs ask for. */
function formatOuterTitle(pageTitle: string): string {
  return `${pageTitle} — Outer`;
}

function formatInnerTitle(pageTitle: string): string {
  return `${pageTitle} — Inner`;
}

/** Reads the template out of context and shows what it makes of a title. */
function TemplateProbe() {
  const titleTemplate = useContext(HeadContext);

  return <span data-testid="probe">{titleTemplate("Page")}</span>;
}

describe("HeadProvider", () => {
  it("uses the page title verbatim when there is no provider", () => {
    render(<TemplateProbe />);

    expect(screen.getByTestId("probe").textContent).toBe("Page");
  });

  it("provides its template to descendants", () => {
    render(
      <HeadProvider titleTemplate={formatOuterTitle}>
        <TemplateProbe />
      </HeadProvider>,
    );

    expect(screen.getByTestId("probe").textContent).toBe("Page — Outer");
  });

  it("lets the nearest provider win", () => {
    render(
      <HeadProvider titleTemplate={formatOuterTitle}>
        <HeadProvider titleTemplate={formatInnerTitle}>
          <TemplateProbe />
        </HeadProvider>
      </HeadProvider>,
    );

    expect(screen.getByTestId("probe").textContent).toBe("Page — Inner");
  });
});
