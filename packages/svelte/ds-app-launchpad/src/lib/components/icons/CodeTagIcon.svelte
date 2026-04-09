<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="code-tag" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.989624 8.00001L5.76259 12.773L6.82326 11.7123L3.11094 8.00001L6.82326 4.2877L5.76259 3.22704L0.989624 8.00001Z"
      fill="currentColor"
    ></path>
    <path
      d="M15.0104 8.00001L10.2374 12.773L9.17673 11.7123L12.889 8.00001L9.17673 4.2877L10.2374 3.22704L15.0104 8.00001Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
