import { onMount } from "svelte";

export function useIsMounted() {
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });

  return {
    get value() {
      return mounted;
    },
  };
}
