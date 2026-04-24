<script lang="ts">
  /* @canonical/generator-ds 0.9.0-experimental.22 */
  import { UserIcon } from "@canonical/svelte-icons";
  import type { UserAvatarProps } from "./types.js";
  import "./styles.css";
  import { getInitials } from "./utils/index.js";

  const componentCssClassName = "ds user-avatar";

  const {
    class: classProp,
    userName: userNameProp,
    userAvatarUrl,
    size = "medium",
    alt,
    ...rest
  }: UserAvatarProps = $props();

  const className = $derived([componentCssClassName, size, classProp]);
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
    class={className}
    src={userAvatarUrl}
    {alt}
    title={userName || undefined}
    data-initials={userInitials}
    onerror={() => (imageError = true)}
    {...rest}
  />
{:else if userName}
  <abbr class={className} title={userName} {...rest}>
    {userInitials}
  </abbr>
{:else}
  <div class={className} {...rest}>
    <UserIcon />
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
