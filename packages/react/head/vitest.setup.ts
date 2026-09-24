import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Worker reuse (isolate:false) shares one jsdom document across files, so
// cleanup is registered per file here rather than relying on the library's
// module-scope auto-cleanup, which only binds to the first file a worker runs.
afterEach(() => {
  cleanup();
});
