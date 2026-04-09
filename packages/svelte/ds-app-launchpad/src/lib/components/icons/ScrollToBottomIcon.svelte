<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="scroll-to-bottom" {...props}>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.6797 6.60938L11.7959 5.72461L8.74414 8.77637L8.74512 1.25H7.24512V8.77637L4.19531 5.72461L3.30957 6.60938L7.99512 11.293L12.6797 6.60938Z"
      fill="currentColor"
    ></path>
    <path d="M15 13.002H1V14.502H15V13.002Z" fill="currentColor"></path>
  </svg>
</IconBase>
