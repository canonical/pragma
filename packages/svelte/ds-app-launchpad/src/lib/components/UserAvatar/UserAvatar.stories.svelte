<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import UserAvatar from "./UserAvatar.svelte";

  const userAvatarUrl = "https://assets.ubuntu.com/v1/fca94c45-snap+icon.png";

  const { Story } = defineMeta({
    title: "Components/UserAvatar",
    tags: ["autodocs"],
    component: UserAvatar,
  });
</script>

<Story name="Default" args={{ userName: "John Doe", userAvatarUrl }} />

<Story
  name="Sizes"
  args={{ userName: "John Doe" }}
  argTypes={{ size: { table: { disable: true } } }}
>
  {#snippet template(args)}
    <div class="row">
      {#each ["small", "medium", "large"] as const as size (size)}
        <UserAvatar {...args} {size} />
      {/each}
    </div>
    <br />
    <div class="row">
      {#each ["small", "medium", "large"] as const as size (size)}
        <UserAvatar {...args} {size} userName={undefined} />
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Without user data" />

<Story
  name="Without avatar URL"
  args={{
    userName: "Jane Doe",
  }}
/>

<Story
  name="When avatar fails to load"
  args={{
    userName: "That's Not An Image",
    userAvatarUrl: "invalid-url",
  }}
/>

<Story
  name="When avatar fails to load and no name is provided"
  args={{
    userAvatarUrl: "invalid-url",
  }}
/>

<Story
  name="With a very long name"
  tags={["!autodocs"]}
  args={{
    userName: "Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit",
  }}
/>

<!-- Simulate no JavaScript environment by overriding the onerror handler -->

<Story
  name="When avatar fails to load (no JavaScript)"
  tags={["!autodocs"]}
  args={{
    userAvatarUrl: "invalid-url",
    userName: "John Doe",
    onerror: () => {},
  }}
/>

<Story
  name="When avatar fails to load and no name is provided (no JavaScript)"
  tags={["!autodocs"]}
  args={{
    userAvatarUrl: "invalid-url",
    onerror: () => {},
  }}
/>
