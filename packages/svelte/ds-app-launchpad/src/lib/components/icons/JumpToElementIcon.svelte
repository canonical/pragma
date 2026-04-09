<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="jump-to-element" {...props}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
  >
    <path
      d="M8.50393 12H7.00393V8.06055L1.06154 14L1.23978e-05 12.9395L5.9424 7H2.00391V5.5H8.50393V12Z"
      fill="currentColor"
    ></path>
    <path
      d="M14.0039 9.00001L10.5039 9V7.5L12.5039 7.50001V5.5H14.0039V9.00001Z"
      fill="currentColor"
    ></path>
    <path
      d="M8.50393 1.5L6.50393 1.5V3.5H5.00393V0L8.50393 4.76837e-06V1.5Z"
      fill="currentColor"
    ></path>
    <path
      d="M14.0039 3.5H12.5039V1.5H10.5039V4.85778e-06H14.0039V3.5Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
