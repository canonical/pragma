import { describe, expect, it } from "vitest";
import getLocalName from "./getLocalName.js";

describe("getLocalName", () => {
  it("takes the part after the last hash", () => {
    expect(getLocalName("http://www.w3.org/2000/01/rdf-schema#label")).toBe(
      "label",
    );
  });

  it("takes the part after the last slash", () => {
    expect(getLocalName("https://ds.canonical.com/Component")).toBe(
      "Component",
    );
  });

  it("prefers the hash when both a hash and a slash are present", () => {
    expect(getLocalName("http://ex.org/path#frag")).toBe("frag");
  });

  it("returns the whole string when neither separator is present", () => {
    expect(getLocalName("bareword")).toBe("bareword");
  });

  it("returns an empty string when the separator is the last character", () => {
    expect(getLocalName("http://ex.org/")).toBe("");
  });
});
