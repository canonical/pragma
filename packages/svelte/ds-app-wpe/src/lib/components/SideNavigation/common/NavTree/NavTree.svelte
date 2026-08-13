<script lang="ts">
  import { findAncestorPath, getItemId } from "@canonical/utils";
  import { SvelteSet } from "svelte/reactivity";
  import { Item } from "../Item/index.js";
  import { setNavTreeContext } from "./context.js";
  import type { NavTreeProps } from "./types.js";
  import { useNavTree } from "./useNavTree.svelte.js";
  import "./styles.css";

  let { root, currentUrl }: NavTreeProps = $props();

  const tree = useNavTree({ root: () => root });
  const groups = $derived(tree.annotatedRoot.items ?? []);

  // Ids of expanded (disclosed) items, shared by every Item in this tree.
  const expandedIds = new SvelteSet<string>();

  // Shared with every Item beneath this tree via context — see
  // `common/NavTree/context.ts` — instead of threading tree/expandedIds/
  // currentUrl through each level of Item's own recursion.
  setNavTreeContext({ tree, expandedIds, currentUrl: () => currentUrl });

  // Reveal the active item: whenever currentUrl resolves to an item, open its
  // expandable ancestors. Only ever ADDS ids, so it never re-collapses a
  // group the user opened or closed by hand.
  $effect(() => {
    if (currentUrl === undefined) return;
    const match = tree.index[currentUrl];
    if (!match) return;
    for (const ancestor of findAncestorPath(tree.index, match)) {
      if (ancestor.depth >= 2 && ancestor.items?.length) {
        expandedIds.add(getItemId(ancestor));
      }
    }
  });
</script>

<div class="ds nav-tree">
  {#each groups as group (getItemId(group))}
    <section class="group">
      {#if group.label}
        <span class="header p">{group.label}</span>
      {/if}
      <ul class="list">
        {#each group.items ?? [] as item (getItemId(item))}
          <Item {item} />
        {/each}
      </ul>
    </section>
  {/each}
</div>

<!-- @component
Internal: renders a navigation tree from a root NavItem (its direct children
are groups; each group's items are the rendered rows). Shared by
`SideNavigation.Content` and `SideNavigation.Footer` — each region drives its
own `useNavTree` instance, so they're independent keyboard/focus domains.
-->
