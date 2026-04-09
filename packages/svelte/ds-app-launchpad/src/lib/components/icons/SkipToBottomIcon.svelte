<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="skip-to-bottom" {...props}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M1 15.0028L1 13.5001L15 13.5001V15.0028L1 15.0028Z"
      fill="currentColor"
    ></path>
    <path
      d="M8.0003 12.0094L1.99542 6.00451L3.05608 4.94385L8.0003 9.88807L12.9445 4.94385L14.0052 6.00451L8.0003 12.0094Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
