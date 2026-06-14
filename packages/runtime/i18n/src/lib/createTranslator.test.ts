import { describe, expect, it } from "vitest";
import createTranslator from "./createTranslator.js";
import type { Messages } from "./types.js";

const messages: Messages = {
  "nav.home": "Home",
  greeting: "Hello, {name}!",
  pair: "{a} and {b}",
  items: { one: "{count} item", other: "{count} items" },
  arItems: {
    zero: "لا عناصر",
    one: "عنصر",
    two: "عنصران",
    few: "{count} عناصر",
    many: "{count} عنصرًا",
    other: "{count} عنصر",
  },
};

describe("createTranslator", () => {
  const t = createTranslator("en", messages);

  it("returns the key verbatim when it is missing", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  it("returns a plain string entry", () => {
    expect(t("nav.home")).toBe("Home");
  });

  it("interpolates variables", () => {
    expect(t("greeting", { name: "Ada" })).toBe("Hello, Ada!");
    expect(t("pair", { a: 1, b: 2 })).toBe("1 and 2");
  });

  it("leaves an absent placeholder untouched", () => {
    expect(t("greeting")).toBe("Hello, {name}!");
  });

  it("selects an English plural branch by count", () => {
    expect(t("items", { count: 1 })).toBe("1 item");
    expect(t("items", { count: 5 })).toBe("5 items");
  });

  it("falls back to the other branch when count is absent", () => {
    expect(t("items")).toBe("{count} items");
  });

  it("uses locale-specific plural categories", () => {
    const ar = createTranslator("ar", messages);
    expect(ar("arItems", { count: 0 })).toBe("لا عناصر");
    expect(ar("arItems", { count: 1 })).toBe("عنصر");
    expect(ar("arItems", { count: 2 })).toBe("عنصران");
    expect(ar("arItems", { count: 3 })).toBe("3 عناصر");
    expect(ar("arItems", { count: 11 })).toBe("11 عنصرًا");
    expect(ar("arItems", { count: 100 })).toBe("100 عنصر");
  });

  it("falls back to other when the selected category is undefined", () => {
    const sparse = createTranslator("ar", { x: { other: "{count} other" } });
    expect(sparse("x", { count: 3 })).toBe("3 other");
  });
});
