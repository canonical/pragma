import { describe, expect, it } from "vitest";
import { localName, resolveLabel, resolveTitle } from "./descriptive.js";

describe("localName", () => {
  it("takes everything after the last hash", () => {
    expect(localName("https://metro.example/onto#Station")).toBe("Station");
  });

  it("takes everything after the last slash when there is no hash", () => {
    expect(localName("https://metro.example/stop/northgate")).toBe("northgate");
  });

  it("splits on whichever separator comes last, not on the hash by rank", () => {
    expect(localName("https://metro.example/onto#a/b")).toBe("b");
  });

  it("is empty when the IRI ends in a separator", () => {
    expect(localName("https://metro.example/stop/")).toBe("");
  });

  it("returns the whole string when there is no separator at all", () => {
    expect(localName("bare")).toBe("bare");
  });
});

describe("resolveLabel", () => {
  it("prefers an exact language tag", () => {
    expect(resolveLabel({ "": "Northgate", fr: "Porte-Nord" }, "fr")).toBe(
      "Porte-Nord",
    );
  });

  it("falls back to the untagged literal", () => {
    expect(resolveLabel({ "": "Northgate", fr: "Porte-Nord" }, "de")).toBe(
      "Northgate",
    );
  });

  it("is null when nothing is asserted", () => {
    expect(resolveLabel({ fr: "Porte-Nord" }, "de")).toBeNull();
  });

  it("is null when there is no label map at all", () => {
    expect(resolveLabel(undefined, "en")).toBeNull();
  });

  it("treats an asserted empty string as a value, not a miss", () => {
    expect(resolveLabel({ fr: "" }, "fr")).toBe("");
  });
});

describe("resolveTitle", () => {
  const uri = "https://metro.example/stop/northgate";

  it("uses the label for the requested language", () => {
    expect(
      resolveTitle({ "": "Northgate", fr: "Porte-Nord" }, "fr", uri, "Station"),
    ).toBe("Porte-Nord");
  });

  it("uses the untagged label when the language has none", () => {
    expect(
      resolveTitle({ "": "Northgate", fr: "Porte-Nord" }, "de", uri, "Station"),
    ).toBe("Northgate");
  });

  it("falls through an empty label to any other asserted literal", () => {
    expect(
      resolveTitle({ "": "", fr: "Porte-Nord" }, "en", uri, "Station"),
    ).toBe("Porte-Nord");
  });

  it("falls back to the IRI's local name when nothing is asserted", () => {
    expect(resolveTitle(undefined, "en", uri, "Station")).toBe("northgate");
  });

  it("falls back to the local name when every literal is empty", () => {
    expect(resolveTitle({ "": "" }, "en", uri, "Station")).toBe("northgate");
  });

  it("falls back to the whole IRI when the local name is empty", () => {
    expect(
      resolveTitle(undefined, "en", "https://metro.example/stop/", "Station"),
    ).toBe("https://metro.example/stop/");
  });

  it("falls back to the typename when there is no IRI at all", () => {
    expect(resolveTitle(undefined, "en", null, "GeoPoint")).toBe("GeoPoint");
  });

  it("prefers an asserted label over the typename for an embeddable", () => {
    expect(resolveTitle({ "": "Here" }, "en", null, "GeoPoint")).toBe("Here");
  });
});
