<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="expand-right" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 1L3 15H1.5L1.5 1H3Z" fill="currentColor"></path>
    <path
      d="M8.91555 11.6844L11.8779 8.72209L4.9 8.72209V7.22209L11.8778 7.22209L8.91555 4.25982L9.97621 3.19916L14.7492 7.97213L9.97621 12.7451L8.91555 11.6844Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
