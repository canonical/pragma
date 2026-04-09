<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="skip-to-top" {...props}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M15 0.999514V2.50231L1 2.5023L1 0.999512L15 0.999514Z"
      fill="currentColor"
    ></path>
    <path
      d="M7.99951 3.99304L14.0044 9.99793L12.9437 11.0586L7.99951 6.11436L3.05529 11.0586L1.99463 9.99792L7.99951 3.99304Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
