import { describe, expect, it } from "vitest";
import prependStamp from "./prependStamp.js";

describe("prependStamp", () => {
  it("prepends stamp to normal content (same byte shape as applyStamp)", () => {
    expect(prependStamp("content", "// stamp")).toBe("// stamp\n\ncontent");
  });

  it("places stamp after shebang line", () => {
    const content = "#!/bin/bash\necho hello";
    expect(prependStamp(content, "# stamp")).toBe(
      "#!/bin/bash\n# stamp\n\necho hello",
    );
  });

  it("keeps a newline-less shebang on the first line", () => {
    // The shebang must stay the file's first bytes — a stamp above it breaks
    // interpreter selection.
    const content = "#!/bin/bash";
    expect(prependStamp(content, "# stamp")).toBe("#!/bin/bash\n# stamp\n\n");
  });

  it("handles empty content", () => {
    expect(prependStamp("", "// stamp")).toBe("// stamp\n\n");
  });

  it("handles multiline content", () => {
    expect(prependStamp("line1\nline2\nline3", "// stamp")).toBe(
      "// stamp\n\nline1\nline2\nline3",
    );
  });
});
