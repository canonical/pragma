import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import composeMessage from "./composeMessage.js";

describe("composeMessage", () => {
  it("words a message around text names as plain text", () => {
    expect(composeMessage((place) => `Hide ${place("Status")}`)).toBe(
      "Hide Status",
    );
    expect(composeMessage((place) => `Row ${place(7)}`)).toBe("Row 7");
  });

  it("places a name drawn as an element wherever the message puts it", () => {
    const { container } = render(
      <p>
        {composeMessage(
          (place) => `${place(<abbr title="Cores">C</abbr>)} is always shown`,
        )}
      </p>,
    );
    expect(container.querySelector("p")).toHaveTextContent("C is always shown");
    expect(container.querySelector("p > abbr")).toHaveAttribute(
      "title",
      "Cores",
    );
  });

  it("places several names in the message's own order, text and elements alike", () => {
    const { container } = render(
      <p>
        {composeMessage(
          (place) =>
            `Trié par ${place(<b>Cores</b>)}, puis ${place("Name")}, puis ${place(<i>Status</i>)}`,
        )}
      </p>,
    );
    expect(container.querySelector("p")).toHaveTextContent(
      "Trié par Cores, puis Name, puis Status",
    );
    expect(container.querySelector("p > b")).toHaveTextContent("Cores");
    expect(container.querySelector("p > i")).toHaveTextContent("Status");
  });

  it("loses a name the message dropped, never another's", () => {
    const { container } = render(
      <p>{composeMessage((place) => `${place(<b>Gone</b>)}`.slice(1))}</p>,
    );
    expect(container.querySelector("b")).toBeNull();
  });
});
