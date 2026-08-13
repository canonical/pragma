<script lang="ts">
  import { getItemId, NavigationActionType } from "@canonical/utils";
  import { tick } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { getNavTreeContext } from "../NavTree/context.js";
  import Item from "./Item.svelte";
  import type { ItemProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-navigation-item";

  let { item }: ItemProps = $props();

  // `tree`/`expandedIds` are stable objects, safe to destructure. `currentUrl`
  // is a getter (see NavTreeContext) — read as `context.currentUrl` below,
  // never destructured, so it keeps tracking NavTree's own prop.
  const context = getNavTreeContext();
  const { tree, expandedIds } = context;

  const id = $derived(getItemId(item));
  const hasChildren = $derived((item.items?.length ?? 0) > 0);
  const isExpanded = $derived(expandedIds.has(id));
  const isCurrent = $derived(
    !item.disabled &&
      context.currentUrl !== undefined &&
      item.url === context.currentUrl,
  );

  // Registers this row as `item`'s focusable element with the owning tree
  // (so arrow-key navigation can `.focus()` it), and unregisters on cleanup.
  const registerRowAttachment: Attachment<HTMLElement> = (node) => {
    tree.register(item, node);
    return () => tree.register(item, null);
  };

  // Mouse click only ever toggles — moving focus to the first child on expand
  // is a keyboard-only courtesy (see expandAndFocusFirstChild), matching the
  // spec: "If an expandable navigation item was expanded WITH THE KEYBOARD the
  // first item of the children is focused."
  function toggleExpanded(): void {
    if (isExpanded) expandedIds.delete(id);
    else expandedIds.add(id);
  }

  async function expandAndFocusFirstChild(): Promise<void> {
    if (!isExpanded) {
      expandedIds.add(id);
      // Let the sublist render before asking the tree to focus into it.
      await tick();
    }
    tree.move(item, NavigationActionType.ARROW_RIGHT);
  }

  // Arrow keys move across items at the SAME level only — Up/Down between
  // siblings (crossing group boundaries at the edges, never spilling into a
  // sibling's own subitems), Left/Right explicitly cross a level. Enter is the
  // only other way in: expand-and-focus-first-child on an expandable item,
  // per the spec. Native `<a>`/`<button>` handle activation and Space
  // themselves, so neither is special-cased here.
  function handleKeydown(event: KeyboardEvent): void {
    if (item.disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        tree.move(item, NavigationActionType.ARROW_DOWN);
        break;
      case "ArrowUp":
        event.preventDefault();
        tree.move(item, NavigationActionType.ARROW_UP);
        break;
      case "ArrowRight":
        if (!hasChildren) break;
        event.preventDefault();
        void expandAndFocusFirstChild();
        break;
      case "ArrowLeft":
        if (hasChildren && isExpanded) {
          // Collapse in place — focus stays on this item.
          event.preventDefault();
          expandedIds.delete(id);
        } else if (item.depth > 2) {
          // A subitem: move up to its (always-expanded, since we're inside
          // it) parent item. Never resolves to a group — those aren't
          // interactive — because depth-2 items stop here instead.
          event.preventDefault();
          tree.move(item, NavigationActionType.ARROW_LEFT);
        }
        break;
      case "Home":
        event.preventDefault();
        tree.move(item, NavigationActionType.HOME);
        break;
      case "End":
        event.preventDefault();
        tree.move(item, NavigationActionType.END);
        break;
      case "Enter":
        if (hasChildren) {
          event.preventDefault();
          if (isExpanded) expandedIds.delete(id);
          else void expandAndFocusFirstChild();
        }
        break;
      default:
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          event.preventDefault();
          tree.typeAhead(item, event.key);
        }
    }
  }
</script>

{#if hasChildren}
  <li
    class={[componentCssClassName, item.class]}
    data-disabled={item.disabled || undefined}
  >
    <button
      {@attach registerRowAttachment}
      type="button"
      class="row"
      disabled={item.disabled}
      aria-expanded={isExpanded}
      onclick={toggleExpanded}
      onkeydown={handleKeydown}
    >
      <span class="start">{#if item.icon}{@render item.icon()}{/if}</span>
      <span class="label">{item.label}</span>
      <svg
        class="end caret"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    {#if isExpanded}
      <ul class="sublist">
        {#each item.items ?? [] as child (getItemId(child))}
          <Item item={child} />
        {/each}
      </ul>
    {/if}
  </li>
{:else if item.url && !item.disabled}
  <li class={[componentCssClassName, item.class]}>
    <a
      {@attach registerRowAttachment}
      class="row"
      href={item.url}
      aria-current={isCurrent ? "page" : undefined}
      onkeydown={handleKeydown}
    >
      <span class="start">{#if item.icon}{@render item.icon()}{/if}</span>
      <span class="label">{item.label}</span>
      {#if item.slot}
        <span class="end slot">{@render item.slot()}</span>
      {/if}
    </a>
  </li>
{:else}
  <li
    class={[componentCssClassName, item.class]}
    data-disabled={item.disabled || undefined}
  >
    <span class="row" aria-disabled={item.disabled || undefined}>
      <span class="start">{#if item.icon}{@render item.icon()}{/if}</span>
      <span class="label">{item.label}</span>
      {#if item.slot}
        <span class="end slot">{@render item.slot()}</span>
      {/if}
    </span>
  </li>
{/if}

<!-- @component
`SideNavigation.Item` renders a single navigation row, recursively rendering
its own subitems (one level deep, per the spec) when expanded. Not meant to be
used standalone — rendered internally by `SideNavigation.Content` /
`SideNavigation.Footer` from a `NavItem` tree.
-->
