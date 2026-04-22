<script module lang="ts">
  import {
    HomeIcon,
    LinkIcon,
    LogOutIcon,
    MountIcon,
    NotificationsIcon,
    PodsIcon,
    UserIcon,
  } from "@canonical/svelte-icons";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { cssControlledFade } from "../../transitions/cssControlledFade.js";
  import { ColorPaletteIcon } from "../icons/index.js";
  import { SideNavigation } from "./index.js";

  const { Story } = defineMeta({
    title: "Components/SideNavigation",
    tags: ["autodocs"],
    component: SideNavigation,
    argTypes: {
      children: { control: { disable: true } },
      expandToggle: { control: { disable: true } },
      footer: { control: { disable: true } },
      logo: { control: { disable: true } },
    },
  });

  let expandedState = $state(true);

  const icons = [
    HomeIcon,
    UserIcon,
    LogOutIcon,
    LinkIcon,
    NotificationsIcon,
    PodsIcon,
    MountIcon,
  ];
</script>

<Story name="Default">
  {#snippet template({
    children: _,
    expandToggle: __,
    footer: ___,
    expanded: expandedProp,
    ...args
  })}
    {@const expanded = expandedProp ?? expandedState}
    <SideNavigation {...args} {expanded}>
      {#snippet logo()}
        <a
          href="/"
          aria-label="Canonical Home"
          style="display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: inherit;"
          onclick={(e: MouseEvent) => e.preventDefault()}
        >
          <span
            style="background-color: #e95420; display: flex; align-items: flex-end; justify-content: center; width: 1.375rem; height: 2.375rem; padding-bottom: 0.25rem; flex-shrink: 0;"
          >
            <img
              src="https://assets.ubuntu.com/v1/82818827-CoF_white.svg"
              alt=""
              width="20"
              height="20"
              aria-hidden="true"
            />
          </span>
          {#if expanded}
            <span
              style="font-size: 1.3rem; font-weight: 300; line-height: 1rem;"
              transition:cssControlledFade={{
                durationVar: "--transition-duration-side-navigation",
                easingVar: "--transition-easing-side-navigation",
              }}
            >
              Canonical
            </span>
          {/if}
        </a>
      {/snippet}
      {#snippet expandToggle(toggleProps)}
        <SideNavigation.ExpandToggle
          {...toggleProps}
          onclick={() => (expandedState = !expandedState)}
        />
      {/snippet}
      {#each { length: 60 }, i (i)}
        {@const Icon = icons[i % icons.length]}
        {#if i % 2}
          <SideNavigation.NavigationItem
            href={`/item${i}`}
            selected={i === 1}
            onclick={(e: MouseEvent) => e.preventDefault()}
          >
            Link Item {i}
            {#snippet icon()}
              <Icon />
            {/snippet}
          </SideNavigation.NavigationItem>
        {:else}
          <SideNavigation.NavigationItem>
            Button Item {i}
            {#snippet icon()}
              <Icon />
            {/snippet}
          </SideNavigation.NavigationItem>
        {/if}
      {/each}
      {#snippet footer()}
        <SideNavigation.NavigationItem>
          {#snippet icon()}
            <ColorPaletteIcon />
          {/snippet}
          Theme: Light
        </SideNavigation.NavigationItem>
        <SideNavigation.NavigationItem
          href="/"
          onclick={(e: MouseEvent) => e.preventDefault()}
        >
          {#snippet icon()}
            <UserIcon />
          {/snippet}
          $username
        </SideNavigation.NavigationItem>
        <SideNavigation.NavigationItem>
          {#snippet icon()}
            <LogOutIcon />
          {/snippet}
          Logout
        </SideNavigation.NavigationItem>
      {/snippet}
    </SideNavigation>
  {/snippet}
</Story>
