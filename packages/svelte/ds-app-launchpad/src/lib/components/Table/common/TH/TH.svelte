<!-- @canonical/generator-ds 0.10.0-experimental.5 -->

<script lang="ts">
  import { setTHContext } from "./context.js";
  import type { THProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds table-th";

  let {
    class: className,
    children,
    "aria-sort": sortDirection,
    action,
    ...rest
  }: THProps = $props();

  const cellContentId = $props.id();

  setTHContext({
    get sortDirection() {
      return sortDirection;
    },
  });
</script>

<th
  class={[componentCssClassName, className]}
  aria-sort={sortDirection}
  // Omit actions from the cell's accessible name. Otherwise, when user navigates the table, the sort button's label (e.g. "Sort by Name ascending") would be included every time when a screen reader announces associated header cell.
  aria-labelledby={cellContentId}
  {...rest}
>
  <div>
    <span id={cellContentId}>
      {@render children?.()}
    </span>
    {@render action?.()}
  </div>
</th>
