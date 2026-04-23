import { describe, expect, it } from "vitest";
import prependStamp from "./prependStamp.js";

describe("prependStamp", () => {
  it("prepends stamp to normal content", () => {
    expect(prependStamp("content", "// stamp")).toBe("// stamp\ncontent");
  });

  it("places stamp after shebang line", () => {
    const content = "#!/bin/bash\necho hello";
    expect(prependStamp(content, "# stamp")).toBe(
      "#!/bin/bash\n# stamp\necho hello",
    );
  });

  it("handles shebang-only content (no newline) — prepends normally", () => {
    const content = "#!/bin/bash";
    expect(prependStamp(content, "# stamp")).toBe("# stamp\n#!/bin/bash");
  });

  it("handles empty content", () => {
    expect(prependStamp("", "// stamp")).toBe("// stamp\n");
  });

  it("handles multiline content", () => {
    expect(prependStamp("line1\nline2\nline3", "// stamp")).toBe(
      "// stamp\nline1\nline2\nline3",
    );
  });
});
