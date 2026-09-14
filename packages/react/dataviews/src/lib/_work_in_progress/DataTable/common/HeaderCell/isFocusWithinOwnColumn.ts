/**
 * Whether focus moving to `next` stays with this column: inside its header,
 * or inside the surface its header's menu trigger controls, which the menu
 * portals outside the header. Another column's menu is not this column's.
 */
export default function isFocusWithinOwnColumn(
  header: Element,
  next: Element,
): boolean {
  if (header.contains(next)) {
    return true;
  }
  const controlled = header
    .querySelector("[aria-haspopup='menu'][aria-controls]")
    ?.getAttribute("aria-controls");
  return (
    typeof controlled === "string" &&
    header.ownerDocument.getElementById(controlled)?.contains(next) === true
  );
}
