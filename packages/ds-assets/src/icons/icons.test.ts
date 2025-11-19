import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "./constants.js";
import type { IconName } from "./types.js";

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

  it("each icon SVG file is well-formed XML", async () => {
    const iconsDir = join(process.cwd(), "icons");
    const files = readdirSync(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith(".svg"));
    const parser = new DOMParser();

    svgFiles.forEach((svgFile) => {
      const svgContents = readFileSync(join(iconsDir, svgFile), "utf-8");
      const svgDoc = parser.parseFromString(svgContents, "image/svg+xml");
      // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#error_handling
      const parseError = svgDoc.querySelector("parsererror");

      expect(
        parseError,
        `${svgFile} is not well-formed XML: ${parseError?.textContent}`,
      ).toBeNull();
    });
  });

  it("each icon in the icons directory has a g element with an id matching its file name", async () => {
    const iconsDir = join(process.cwd(), "icons");
    const files = readdirSync(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith(".svg"));
    const parser = new DOMParser();
    svgFiles.forEach((svgFile) => {
      const svgContents = readFileSync(join(iconsDir, svgFile), "utf-8");
      const svgDoc = parser.parseFromString(svgContents, "image/svg+xml");

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
