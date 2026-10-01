/**
 * Combines an ID and a sub-ID into a single string with separator. Useful for cases where multiple elements in a component require a unique id attribute.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   const id = $props.id();
 *   const elementId = subId(id, "sub-id");
 * </script>
 * <div id={id}>Content</div>
 * <div id={elementId}>Other content</div>
 * ```
 */
export function subId(id: string, subId: string) {
  return `${id}|${subId}`;
}
