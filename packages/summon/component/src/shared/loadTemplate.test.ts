import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { setEmbeddedFiles } from "@canonical/summon-core/embedded";
import { afterEach, describe, expect, it } from "vitest";
import { loadTemplateSync } from "./loadTemplate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(here, "..", "templates");
/** A path shaped like the compiled binary's — nothing is on disk under it. */
const inBinary = (rel: string) => `/$bunfs/root/templates/${rel}`;

afterEach(() => {
  setEmbeddedFiles({});
});

describe("loadTemplateSync", () => {
  it("reads a real template from disk", () => {
    const result = loadTemplateSync(
      path.join(templatesDir, "react", "types.ts.ejs"),
    );
    expect(result.content).toContain("Props");
  });

  it("binds the embedded lookup to THIS package's scope", () => {
    // The scope is the fact this module owns. An entry embedded under another
    // package's name must NOT serve a component template — that is the failure
    // a fork hit when the manifest and the loader disagreed on the prefix.
    setEmbeddedFiles({ "@canonical/summon-package/react/types.ts.ejs": "NO" });
    expect(() => loadTemplateSync(inBinary("react/types.ts.ejs"))).toThrow(
      /@canonical\/summon-component\/react\/types\.ts\.ejs/,
    );

    setEmbeddedFiles({
      "@canonical/summon-component/react/types.ts.ejs": "YES",
    });
    expect(loadTemplateSync(inBinary("react/types.ts.ejs")).content).toBe(
      "YES",
    );
  });

  it("keeps same-named templates of different frameworks apart", () => {
    setEmbeddedFiles({
      "@canonical/summon-component/react/types.ts.ejs": "REACT",
      "@canonical/summon-component/svelte/types.ts.ejs": "SVELTE",
      "@canonical/summon-component/lit/types.ts.ejs": "LIT",
    });
    expect(loadTemplateSync(inBinary("react/types.ts.ejs")).content).toBe(
      "REACT",
    );
    expect(loadTemplateSync(inBinary("svelte/types.ts.ejs")).content).toBe(
      "SVELTE",
    );
    expect(loadTemplateSync(inBinary("lit/types.ts.ejs")).content).toBe("LIT");
  });

  it("throws — never returns empty — when nothing serves the path", () => {
    expect(() => loadTemplateSync(inBinary("react/absent.ejs"))).toThrow(
      /Embedded file not found/,
    );
  });
});
