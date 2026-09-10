import { describe, expect, it } from "vitest";
import { createHelpItem } from "./helpItem.js";

describe("createHelpItem", () => {
  it("builds a collapsible Help item", () => {
    const item = createHelpItem("https://ubuntu.com/legal");
    expect(item.key).toBe("help");
    expect(item.label).toBe("Help");
    expect(item.icon).toBe("help");
  });

  it("includes an external link to legal information by default", () => {
    const item = createHelpItem("https://ubuntu.com/legal");
    expect(item.items).toHaveLength(1);
    expect(item.items[0]).toMatchObject({
      url: "https://ubuntu.com/legal",
      label: "Legal information",
      icon: "external-link",
    });
  });

  it("allows overriding the legal link's label", () => {
    const item = createHelpItem("https://ubuntu.com/legal", {
      legalLabel: "Terms & privacy",
    });
    expect(item.items[0].label).toBe("Terms & privacy");
  });

  it("appends additional items after the legal link", () => {
    const item = createHelpItem("https://ubuntu.com/legal", {
      additionalItems: [
        { url: "https://docs.example.com", label: "Documentation" },
      ],
    });
    expect(item.items).toHaveLength(2);
    expect(item.items[1]).toMatchObject({ label: "Documentation" });
  });

  it("never has a url of its own — expandable items cannot link (the 24.04 spec §4.3)", () => {
    const item = createHelpItem("https://ubuntu.com/legal");
    expect(item).not.toHaveProperty("url");
  });
});
