import { existsSync } from "node:fs";
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
    const fs = await import("node:fs");
    const files = fs.readdirSync(iconsDir);
    const svgFiles = files.filter((file) => file.endsWith(".svg"));

    svgFiles.forEach((svgFile) => {
      const iconName = svgFile.replace(".svg", "");
      expect(
        ICON_NAMES.includes(iconName as IconName),
        `Icon ${iconName} exists in the icons directory but is not listed in ICON_NAMES`,
      ).toBe(true);
    });
  });
});
