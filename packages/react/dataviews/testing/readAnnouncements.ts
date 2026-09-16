import { act } from "@testing-library/react";
import { vi } from "vitest";
import { COALESCE_DELAY_MS } from "../src/lib/common/index.js";

/**
 * What every announcer in the document has spoken, oldest first, once
 * what was said in the moment before has been spoken: each announcement's
 * text, in the order they were spoken.
 *
 * @note Impure: waits out the announcer's short delay inside `act` — by
 * advancing where the test controls time, and by waiting where it does not —
 * so what was said has reached the page.
 */
export default async function readAnnouncements(): Promise<readonly string[]> {
  await act(async () => {
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(COALESCE_DELAY_MS);
      return;
    }
    await new Promise((settle) => {
      setTimeout(settle, COALESCE_DELAY_MS);
    });
  });
  return Array.from(
    document.querySelectorAll(".ds.data-views-announcer > *"),
    (announcement) => announcement.textContent ?? "",
  );
}
