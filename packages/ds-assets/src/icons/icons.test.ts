import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ICON_CATEGORIES, ICON_NAMES } from "./constants.js";
import { ICON_METADATA } from "./metadata.js";
import type { IconMetadata, IconName } from "./types.js";

describe("icons", () => {
  it("each icon in `ICON_NAMES` exists in the icons directory", () => {
    const iconsDir = join(process.cwd(), "icons");

    ICON_NAMES.forEach((iconName) => {
      const iconPath = join(iconsDir, `${iconName}.svg`);
      expect(
        existsSync(iconPath),
        `Icon ${iconName} should exist at ${iconPath}`,
      ).toBe(true);
    });
  });

  it("there are no icons in the icons directory that are not in `ICON_NAMES`", async () => {
    const iconsDir = join(process.cwd(), "icons");
    const files = readdirSync(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith(".svg"));

    svgFiles.forEach((svgFile) => {
      const iconName = svgFile.replace(".svg", "");
      expect(
        ICON_NAMES.includes(iconName as IconName),
        `Icon ${iconName} exists in the icons directory but is not listed in ICON_NAMES`,
      ).toBe(true);
    });
  });

  // TODO: find a better way to handle this - consider optimizing JSDOM usage or splitting tests
  it("each icon SVG file is well-formed XML", { timeout: 30000 }, async () => {
    const iconsDir = join(process.cwd(), "icons");
    const files = readdirSync(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith(".svg"));

    svgFiles.forEach((svgFile) => {
      const svgContents = readFileSync(join(iconsDir, svgFile), "utf-8");
      const dom = new JSDOM(svgContents, { contentType: "image/svg+xml" });
      const svgDoc = dom.window.document;
      // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#error_handling
      const parseError = svgDoc.querySelector("parsererror");

      expect(
        parseError,
        `${svgFile} is not well-formed XML: ${parseError?.textContent}`,
      ).toBeNull();
    });
  });

  it("each icon declares a 16x16 viewBox", () => {
    const iconsDir = join(process.cwd(), "icons");
    const files = readdirSync(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith(".svg"));

    // Without a viewBox an icon is pinned to its intrinsic 16px and ignores any
    // size a consumer asks for.
    const offenders = svgFiles.filter((svgFile) => {
      const svgContents = readFileSync(join(iconsDir, svgFile), "utf-8");
      return !/viewBox=['"]0 0 16 16['"]/.test(svgContents);
    });

    expect(offenders, "icons with no 16x16 viewBox").toEqual([]);
  });

  // TODO: find a better way to handle this - consider optimizing JSDOM usage or splitting tests
  it("each icon in the icons directory has a g element with an id matching its file name", {
    timeout: 30000,
  }, async () => {
    const iconsDir = join(process.cwd(), "icons");
    const files = readdirSync(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith(".svg"));

    svgFiles.forEach((svgFile) => {
      const svgContents = readFileSync(join(iconsDir, svgFile), "utf-8");
      const dom = new JSDOM(svgContents, { contentType: "image/svg+xml" });
      const svgDoc = dom.window.document;

      const primaryGroupElement = svgDoc.querySelector("svg > g");
      expect(
        primaryGroupElement,
        `${svgFile} does not contain a <g> element as a direct child of the <svg> element`,
      ).not.toBeNull();

      const iconName = svgFile.replace(".svg", "");
      const gElementId = primaryGroupElement?.getAttribute("id");

      expect(
        gElementId,
        `${svgFile}'s primary group element ID should be '${iconName}', but found '${gElementId}'`,
      ).toBe(iconName);
    });
  });
});

/**
 * A metadata rule, stated as a function from entries to the names that break it.
 * Kept separate from the assertions so each rule can be driven by a fixture as
 * well as by the live data — otherwise a rule no live icon exercises (such as
 * deprecation) would assert nothing at all.
 */
type Entries = readonly (readonly [string, IconMetadata])[];

// Built from the object rather than from `ICON_NAMES`, so a missing entry is
// reported once by the completeness test instead of crashing every shape test
// on `undefined`.
const liveEntries: Entries = Object.entries(ICON_METADATA);

/** A term is a plain lowercase word or hyphen/space separated phrase. */
const TERM = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;

const badReplacements = (
  entries: Entries,
  names: readonly string[],
): string[] =>
  entries
    .filter(([name, meta]) => {
      const replacement = meta.deprecated?.replacedBy;
      if (replacement === undefined) return false;
      return !names.includes(replacement) || replacement === name;
    })
    .map(([name, meta]) => `${name} -> ${meta.deprecated?.replacedBy}`);

describe("metadata", () => {
  // `ICON_METADATA` is typed `Record<IconName, IconMetadata>`, so TypeScript
  // already rejects a missing or extra key. These two run anyway: TypeScript's
  // message inlines all 165 entries and truncates, while these name the icon,
  // and they still hold for JavaScript consumers and for anything that reaches
  // the object through an `as` cast.
  it("every icon in `ICON_NAMES` has a metadata entry", () => {
    const missing = ICON_NAMES.filter((iconName) => !ICON_METADATA[iconName]);

    expect(missing, "icons with no ICON_METADATA entry").toEqual([]);
  });

  it("`ICON_METADATA` has no entries that are not in `ICON_NAMES`", () => {
    const extra = Object.keys(ICON_METADATA).filter(
      (iconName) => !ICON_NAMES.includes(iconName as IconName),
    );

    expect(extra, "ICON_METADATA entries with no icon").toEqual([]);
  });

  it("is keyed in `ICON_NAMES` order, so the two files read side by side", () => {
    expect(Object.keys(ICON_METADATA)).toEqual([...ICON_NAMES]);
  });

  it("`ICON_NAMES` lists every icon once", () => {
    expect(new Set(ICON_NAMES).size, "ICON_NAMES has a duplicate").toBe(
      ICON_NAMES.length,
    );
  });

  it("tags are lowercase, trimmed, deduped, and never the icon's own name", () => {
    const offenders = liveEntries.flatMap(([iconName, meta]) => {
      // A hyphenated name spelled with spaces is still the icon's own name, and
      // carries no search value: "log out" on `log-out`.
      const ownNames = new Set([iconName, iconName.replace(/-/g, " ")]);
      const problems = meta.tags.flatMap((tag) => {
        if (tag !== tag.toLowerCase())
          return [`${iconName}: "${tag}" is not lowercase`];
        if (tag !== tag.trim()) return [`${iconName}: "${tag}" is not trimmed`];
        if (tag === "") return [`${iconName}: has an empty tag`];
        if (ownNames.has(tag))
          return [`${iconName}: repeats its own name as a tag "${tag}"`];
        return [];
      });

      return meta.tags.length === new Set(meta.tags).size
        ? problems
        : [...problems, `${iconName}: has duplicate tags`];
    });

    expect(offenders, "malformed tags").toEqual([]);
  });

  it("tags and aliases are plain lowercase words", () => {
    const offenders = liveEntries.flatMap(([iconName, meta]) =>
      [...meta.tags, ...(meta.aliases ?? [])]
        .filter((term) => !TERM.test(term))
        .map((term) => `${iconName}: ${JSON.stringify(term)}`),
    );

    expect(
      offenders,
      "tags or aliases with punctuation or odd spacing",
    ).toEqual([]);
  });

  it("each icon has at least three tags", () => {
    const thin = liveEntries
      .filter(([, meta]) => meta.tags.length < 3)
      .map(([iconName, meta]) => `${iconName} (${meta.tags.length})`);

    expect(thin, "icons with fewer than 3 tags").toEqual([]);
  });

  it("each icon has at least one category, all from the closed list", () => {
    const offenders = liveEntries.flatMap(([iconName, meta]) => {
      if (meta.categories.length === 0) return [`${iconName}: has no category`];

      const unknown = meta.categories
        .filter((category) => !ICON_CATEGORIES.includes(category))
        .map((category) => `${iconName}: unknown category "${category}"`);

      return meta.categories.length === new Set(meta.categories).size
        ? unknown
        : [...unknown, `${iconName}: has duplicate categories`];
    });

    expect(offenders, "malformed categories").toEqual([]);
  });

  it("categories are in `ICON_CATEGORIES` order, so a filter UI need not sort", () => {
    const offenders = liveEntries
      .filter(([, meta]) => {
        const sorted = [...meta.categories].sort(
          (a, b) => ICON_CATEGORIES.indexOf(a) - ICON_CATEGORIES.indexOf(b),
        );
        return sorted.join() !== meta.categories.join();
      })
      .map(
        ([iconName, meta]) => `${iconName}: [${meta.categories.join(", ")}]`,
      );

    expect(offenders, "categories out of ICON_CATEGORIES order").toEqual([]);
  });

  it("aliases are unique across the whole set and are never live icon names", () => {
    const owners = new Map<string, string>();
    const offenders: string[] = [];

    for (const [iconName, meta] of liveEntries) {
      const aliases = meta.aliases ?? [];

      if (new Set(aliases).size !== aliases.length)
        offenders.push(`${iconName}: repeats an alias`);

      for (const alias of aliases) {
        if (ICON_NAMES.includes(alias as IconName))
          offenders.push(`${iconName}: alias "${alias}" is a live icon name`);

        const owner = owners.get(alias);
        if (owner !== undefined)
          offenders.push(
            `alias "${alias}" is claimed by ${owner} and ${iconName}`,
          );

        owners.set(alias, iconName);
      }
    }

    expect(offenders, "alias conflicts").toEqual([]);
  });

  it("no tag repeats one of the icon's own aliases", () => {
    // Tags may freely overlap other icons' names and aliases — that is how a
    // synonym search works. What carries no information is an icon repeating
    // its own alias, which indexes the same term twice.
    const offenders = liveEntries.flatMap(([iconName, meta]) =>
      meta.tags
        .filter((tag) => (meta.aliases ?? []).includes(tag))
        .map((tag) => `${iconName}: "${tag}"`),
    );

    expect(offenders, "tags that duplicate the icon's own alias").toEqual([]);
  });

  it("every product and theme icon explains itself", () => {
    const offenders = liveEntries
      .filter(
        ([, meta]) =>
          (meta.categories.includes("product") ||
            meta.categories.includes("theme")) &&
          !meta.description?.trim(),
      )
      .map(([iconName, meta]) => `${iconName} (${meta.categories.join("/")})`);

    expect(offenders, "product/theme icons with no description").toEqual([]);
  });

  it("flags a replacement that is missing or self-referential", () => {
    // No icon is deprecated today, so the rule is proven against fixtures —
    // otherwise the live pass below would assert nothing at all.
    const stub = { tags: ["a", "b", "c"], categories: ["action"] } as const;

    expect(
      badReplacements(
        [
          [
            "close",
            { ...stub, deprecated: { replacedBy: "gone" as IconName } },
          ],
          ["edit", { ...stub, deprecated: { replacedBy: "edit" } }],
          ["copy", { ...stub, deprecated: { replacedBy: "close" } }],
          ["hide", { ...stub, deprecated: { since: "0.38.0" } }],
        ],
        ICON_NAMES,
      ),
    ).toEqual(["close -> gone", "edit -> edit"]);
  });

  it("every deprecated icon points at a live replacement", () => {
    expect(
      badReplacements(liveEntries, ICON_NAMES),
      "bad replacements",
    ).toEqual([]);
  });
});
