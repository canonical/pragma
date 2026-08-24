import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "./constants.js";
import { ICON_MANIFEST } from "./manifest.generated.js";

describe("ICON_MANIFEST", () => {
  it("has an entry for every icon in `ICON_NAMES`, and no extras", () => {
    expect(Object.keys(ICON_MANIFEST).sort()).toEqual([...ICON_NAMES].sort());
  });

  it("hashes every entry from the current contents of its source SVG", () => {
    // Guards against the checked-in manifest drifting from the icons it
    // describes — e.g. an icon edited by hand without rerunning
    // `bun run build:icons-manifest`.
    const iconsDir = join(process.cwd(), "icons");

    ICON_NAMES.forEach((iconName) => {
      const contents = readFileSync(join(iconsDir, `${iconName}.svg`));
      const hash = createHash("sha256")
        .update(contents)
        .digest("hex")
        .slice(0, 8);

      expect(
        ICON_MANIFEST[iconName],
        `ICON_MANIFEST["${iconName}"] is stale — rerun \`bun run build:icons-manifest\``,
      ).toBe(`${iconName}.${hash}.svg`);
    });
  });
});
