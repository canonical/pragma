import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FileUploadInput } from "./FileUploadInput.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("FileUploadInput (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<FileUploadInput accept="image/*" multiple />);
    expect(html).toContain("ds input file-upload");
    expect(html).toContain("drop-zone");
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/*"');
  });

  it("renders the dropzone prompt text in the SSR output", () => {
    const html = renderToString(<FileUploadInput />);
    expect(html).toContain("Drop files here or click to browse");
  });
});
