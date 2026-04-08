<script lang="ts">
  /* @canonical/generator-ds 0.9.0-experimental.22 */
  import { UserIcon } from "@canonical/svelte-icons";
  import type { UserAvatarProps } from "./types.js";
  import "./styles.css";
  import { getInitials } from "./utils/index.js";

  const componentCssClassName = "ds user-avatar";

  const {
    class: className,
    userName: userNameProp,
    userAvatarUrl,
    size = "medium",
    ...rest
  }: UserAvatarProps = $props();

  const userName = $derived(userNameProp?.trim() || null);
  const userInitials = $derived(userName ? getInitials(userName) : null);

  let imageError = $state(false);

  // Reset image error state when the avatar URL changes
  $effect.pre(() => {
    userAvatarUrl;
    imageError = false;
  });
</script>

{#if userAvatarUrl && !imageError}
  <img
    class={[componentCssClassName, size, className]}
    src={userAvatarUrl}
    alt={userName ? `${userName}'s avatar` : "User avatar"}
    title={userName || undefined}
    data-initials={userInitials}
    onerror={() => (imageError = true)}
    {...rest}
  />
{:else}
  <div class={[componentCssClassName, "no-image", size, className]} {...rest}>
    {#if userName}
      <abbr title={userName}>{userInitials}</abbr>
    {:else}
      <UserIcon aria-label="User avatar icon" />
    {/if}
  </div>
{/if}

<!-- @component
`UserAvatar` A component that displays a user's avatar.

The avatar will display the user's image if available and able to be loaded, otherwise it will display the first two initials. If neither is available, it will display a default icon placeholder.

In case JavaScript is disabled, and the image at `userAvatarUrl` fails to load, the component will provide a fallback: displaying the user's initials when `userName` is provided, or `?` when it is not.

## Example Usage
```svelte
<UserAvatar userName="John Doe" userAvatarUrl="https://example.com/avatar.png" />
```
-->
