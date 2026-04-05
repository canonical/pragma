import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createServerAppRouter } from "../routes.js";
import EntryServer from "./entry-server.js";

describe("EntryServer", () => {
  it("renders the shell and the server-routed page", async () => {
    const router = createServerAppRouter();

    await router.load("/guides/router-core");
    const initialData = router.dehydrate();

    if (!initialData) {
      throw new Error("Expected dehydrated router state for SSR test.");
    }

    const html = renderToString(
      <EntryServer
        initialData={initialData as unknown as Record<string, unknown>}
        lang="en"
      />,
    );

    expect(html).toContain("Canonical router boilerplate");
    expect(html).toContain("Guide:");
    expect(html).toContain("router-core");
    expect(html).toContain("Hover a navigation link to prefetch route data");
  });
});
