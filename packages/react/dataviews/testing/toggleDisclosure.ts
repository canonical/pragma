import { act } from "@testing-library/react";

/**
 * Open or close the one disclosure inside a container, as its summary's
 * activation does: the element's `open` state moves, and this waits for the
 * `toggle` event the platform queues for it on a later task, where a browser
 * sends it too. The state must move, or no event comes.
 *
 * @note Impure: moves the element's open state and waits for its event.
 */
export default async function toggleDisclosure(
  container: HTMLElement,
  open: boolean,
): Promise<void> {
  const details = container.querySelector("details");
  if (details === null) {
    throw new Error("expected a disclosure in the container");
  }
  await act(async () => {
    const toggled = new Promise<void>((resolve) => {
      details.addEventListener("toggle", () => resolve(), { once: true });
    });
    details.open = open;
    await toggled;
  });
}
