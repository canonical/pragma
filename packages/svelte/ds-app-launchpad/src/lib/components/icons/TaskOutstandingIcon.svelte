<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="task-outstanding" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.9191 3.524L13.1261 4.414L6.65414 13.2L2.99414 9.32L4.08614 8.29L6.51214 10.861L11.9191 3.524Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
