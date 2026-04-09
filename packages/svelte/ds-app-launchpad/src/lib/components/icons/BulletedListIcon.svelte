<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="bulleted-list" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="currentColor"
      d="M3.5 12.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1A.5.5 0 0 1 2 14v-1a.5.5 0 0 1 .5-.5h1Zm9.5.25v1.5H6v-1.5h7ZM3.5 7.5A.5.5 0 0 1 4 8v1a.5.5 0 0 1-.5.5h-1A.5.5 0 0 1 2 9V8a.5.5 0 0 1 .5-.5h1Zm8.5.25v1.5H6v-1.5h6ZM3.5 2.5A.5.5 0 0 1 4 3v1a.5.5 0 0 1-.5.5h-1A.5.5 0 0 1 2 4V3a.5.5 0 0 1 .5-.5h1Zm10.5.25v1.5H6v-1.5h8Z"
    ></path>
  </svg>
</IconBase>
