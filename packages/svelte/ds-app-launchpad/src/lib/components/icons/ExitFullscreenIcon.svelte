<script lang="ts">
  import type { IconProps } from "@canonical/svelte-icons";
  import { IconBase } from "@canonical/svelte-icons";

  const props: IconProps = $props();
</script>

<IconBase iconName="exit-fullscreen" {...props}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M5.5 14V12C5.49998 11.6271 5.36108 11.2676 5.11038 10.9916C4.85968 10.7156 4.51516 10.5428 4.144 10.507L4 10.5H2V9H4C4.79565 9 5.55871 9.31607 6.12132 9.87868C6.68393 10.4413 7 11.2044 7 12V14H5.5Z"
      fill="currentColor"
    ></path>
    <path
      d="M2 5.5V7H4L4.176 6.995C4.93989 6.95011 5.65776 6.61501 6.18272 6.05826C6.70767 5.50151 7.00004 4.76521 7 4V2H5.5V4L5.494 4.144C5.46053 4.4906 5.30752 4.81476 5.06121 5.06089C4.8149 5.30702 4.49062 5.45979 4.144 5.493L4 5.5H2Z"
      fill="currentColor"
    ></path>
    <path
      d="M9.94174 6.18272C10.4985 6.70767 11.2348 7.00004 12 7H14V5.5H12L11.856 5.494C11.5094 5.46053 11.1852 5.30752 10.9391 5.06121C10.693 4.8149 10.5402 4.49062 10.507 4.144L10.5 4V2H9V4L9.005 4.176C9.04989 4.93989 9.38499 5.65776 9.94174 6.18272Z"
      fill="currentColor"
    ></path>
    <path
      d="M9 12V14H10.5V12L10.507 11.856C10.5428 11.4848 10.7156 11.1403 10.9916 10.8896C11.2676 10.6389 11.6271 10.5 12 10.5H14V9H12C11.2044 9 10.4413 9.31607 9.87868 9.87868C9.31607 10.4413 9 11.2044 9 12Z"
      fill="currentColor"
    ></path>
  </svg>
</IconBase>
