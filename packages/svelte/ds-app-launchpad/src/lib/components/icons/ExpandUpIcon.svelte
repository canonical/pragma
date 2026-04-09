<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="expand-up" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M1 13L15 13V14.5L1 14.5V13Z" fill="currentColor"></path>
    <path
      d="M11.6844 7.08363L8.72209 4.12129L8.72209 11.0992H7.22209L7.22209 4.12136L4.25982 7.08363L3.19916 6.02297L7.97213 1.25L12.7451 6.02297L11.6844 7.08363Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
