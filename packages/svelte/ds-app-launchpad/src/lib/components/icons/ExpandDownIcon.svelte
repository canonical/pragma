<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="expand-down" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M1 3L15 3V1.5L1 1.5V3Z" fill="currentColor"></path>
    <path
      d="M11.6844 8.91637L8.72209 11.8787L8.72209 4.90082H7.22209L7.22209 11.8786L4.25982 8.91637L3.19916 9.97703L7.97213 14.75L12.7451 9.97703L11.6844 8.91637Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
