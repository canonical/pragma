/**
 * Determine whether a given event target is (or is contained within) a specific element.
 *
 * @param eventTarget - The target from a DOM event (e.g. `event.target`). May be null.
 * @param element - The element to test containment against.
 * @returns True if the target is the element itself or a descendant - otherwise false.
 */
export function isEventTargetInElement(
  eventTarget: EventTarget | null,
  element: HTMLElement | undefined,
) {
  return Boolean(
    element &&
      eventTarget &&
      eventTarget instanceof Node &&
      (eventTarget === element || element.contains(eventTarget)),
  );
}
