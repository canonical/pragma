<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="heading" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.29871 13.5V2.5H5.2381V6.8H10.7619V2.5H12.7013V13.5H10.7619V8.46H5.2381V13.5H3.29871Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
