import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FileUpload } from "./FileUpload.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("FileUpload (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<FileUpload accept="image/*" multiple />);
    expect(html).toContain("ds input file-upload");
    expect(html).toContain("drop-zone");
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/*"');
  });

  it("renders the dropzone prompt text in the SSR output", () => {
    const html = renderToString(<FileUpload />);
    expect(html).toContain("Drop files here or click to browse");
  });
});
