import { describe, expect, it } from "vitest";
import { createIconIndex } from "./search.js";
import type { IconExplorerMetadata } from "./types.js";

const icons = [
  "delete",
  "close",
  "starred",
  "starred-off",
  "search",
  "expand-side-nav",
  "collapse-side-nav",
  "user",
  "user-profile",
  "bug",
  "add-canvas",
] as const;

const metadata: Record<(typeof icons)[number], IconExplorerMetadata> = {
  delete: {
    tags: ["trash", "bin", "remove", "garbage", "erase"],
    categories: ["action"],
  },
  close: {
    tags: ["cancel", "exit", "cross", "dismiss"],
    categories: ["action"],
  },
  starred: {
    tags: ["star", "favourite", "favorite", "bookmark"],
    categories: ["action"],
  },
  "starred-off": {
    tags: ["star", "off", "not starred"],
    categories: ["action"],
    aliases: ["unstarred"],
  },
  search: {
    tags: ["find", "magnifying glass", "explore"],
    categories: ["action"],
    description: "Look something up.",
  },
  "expand-side-nav": {
    tags: ["expand", "side nav", "sidebar", "panel"],
    categories: ["navigation"],
    aliases: ["toggle-side-nav"],
  },
  "collapse-side-nav": {
    tags: ["collapse", "side nav", "sidebar", "panel"],
    categories: ["navigation"],
  },
  user: { tags: ["person", "avatar", "account"], categories: ["object"] },
  "user-profile": {
    tags: ["person", "avatar", "account", "login"],
    categories: ["object"],
    aliases: ["profile"],
  },
  // No token of the alias appears in the name or tags, so only the alias field
  // can answer a search for it.
  bug: {
    tags: ["issue", "defect", "error"],
    categories: ["object"],
    aliases: ["report-fault"],
  },
  // No tag repeats the words in the name, so only hyphen splitting can match
  // "add canvas".
  "add-canvas": { tags: ["new", "artboard", "board"], categories: ["action"] },
};

/** Three icons whose indexed content differs only by name, to force a real tie. */
const tiedIndex = createIconIndex(["zebra", "ox", "yak"], {
  zebra: { tags: ["widget"], categories: ["object"] },
  ox: { tags: ["widget"], categories: ["object"] },
  yak: { tags: ["widget"], categories: ["object"] },
});

const index = createIconIndex(icons, metadata);
const names = (query: string) => index.search(query).map((r) => r.name);

describe("createIconIndex", () => {
  it("finds an icon by a synonym rather than its name", () => {
    expect(names("trash")[0]).toBe("delete");
  });

  it("finds an icon by the name it used to have, and says which", () => {
    const [first] = index.search("unstarred");

    expect(first.name).toBe("starred-off");
    expect(first.reason).toEqual({ kind: "alias", term: "unstarred" });
  });

  it("labels a synonym match with the tag that matched", () => {
    const [first] = index.search("bin");

    expect(first.name).toBe("delete");
    expect(first.reason).toEqual({ kind: "tag", term: "bin" });
  });

  it("does not label a match the name itself explains", () => {
    expect(index.search("delete")[0].reason).toEqual({ kind: "name" });
  });

  it("puts an exact name first, ahead of icons that only tag it", () => {
    // `starred-off` and `starred` both answer to "star".
    expect(names("starred")[0]).toBe("starred");
  });

  it("ranks a name match above an icon that only tags the word", () => {
    // One icon is called "beacon"; the other merely lists it as a synonym.
    const boostIndex = createIconIndex(["beacon", "lantern"], {
      beacon: { tags: ["signal", "marker"], categories: ["object"] },
      lantern: { tags: ["beacon", "lamp"], categories: ["object"] },
    });

    expect(boostIndex.search("beacon").map((result) => result.name)).toEqual([
      "beacon",
      "lantern",
    ]);
  });

  it("ranks an alias hit above an icon that merely tags the word", () => {
    expect(names("profile")[0]).toBe("user-profile");
  });

  it("finds an icon by a legacy name its own name does not resemble", () => {
    const [first] = index.search("report-fault");

    expect(first.name).toBe("bug");
    expect(first.reason).toEqual({ kind: "alias", term: "report-fault" });
  });

  it("matches on a prefix of a name", () => {
    expect(names("del")).toContain("delete");
  });

  it("matches a hyphenated name typed with spaces", () => {
    // No tag on this icon says "add canvas", so only name splitting can match.
    expect(names("add canvas")).toContain("add-canvas");
  });

  it("narrows on a multi-term query", () => {
    expect(names("expand side nav")[0]).toBe("expand-side-nav");
  });

  it("tolerates a typo", () => {
    // A transposition, not a prefix — only edit-distance matching finds this.
    expect(names("favuorite")).toContain("starred");
  });

  it("tolerates a dropped letter in a name", () => {
    // Not a prefix of "starred" either — this needs edit distance.
    expect(names("starrd")).toContain("starred");
  });

  it("returns every icon in order for an empty query", () => {
    expect(names("")).toEqual([...icons]);
    expect(names("   ")).toEqual([...icons]);
  });

  it("returns nothing for a query no icon answers to", () => {
    expect(names("xyzzyplugh")).toEqual([]);
  });

  it("breaks an exact score tie by shorter name, then alphabetically", () => {
    // All three carry the same single tag, so only the tie-break orders them.
    expect(tiedIndex.search("widget").map((result) => result.name)).toEqual([
      "ox",
      "yak",
      "zebra",
    ]);
  });

  it("finds an icon through its description, and says so", () => {
    const found = index.search("look something up");
    const match = found.find((result) => result.name === "search");

    expect(match).toBeDefined();
    expect(match?.reason).toEqual({ kind: "description" });
  });
});
