/**
 * The element at one position of a queried list, which the case expects
 * to hold it: a missing one fails the case here, with the position named,
 * rather than at the first property read.
 */
export default function elementAt<TElement>(
  elements: readonly TElement[],
  position: number,
): TElement {
  const element = elements.at(position);
  if (element === undefined) {
    throw new Error(
      `expected an element at ${position}, found ${elements.length}`,
    );
  }
  return element;
}
