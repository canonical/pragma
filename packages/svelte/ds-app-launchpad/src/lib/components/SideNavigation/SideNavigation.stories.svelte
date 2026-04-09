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
  import LaunchpadLogo from "../../launchpad-components/LaunchpadLogo.svelte";
  import LaunchpadLogoText from "../../launchpad-components/LaunchpadLogoText.svelte";
  import { cssControlledFade } from "../../transistions/cssControlledFade.js";
  import ColorPaletteIcon from "../icons/ColorPaletteIcon.svelte";
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
          aria-label="Launchpad Home"
          style="display: grid; grid-template-areas: 'logo';"
        >
          {#if expanded}
            <div
              aria-hidden="true"
              style="grid-area: logo;"
              transition:cssControlledFade={{
                durationVar: "--transition-duration-side-navigation",
                easingVar: "--transition-easing-side-navigation",
              }}
            >
              <LaunchpadLogoText />
            </div>
          {/if}
          <div aria-hidden="true" style="grid-area: logo;">
            <LaunchpadLogo />
          </div>
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
          <SideNavigation.NavigationItem href={`/item${i}`} selected={i === 1}>
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
        <SideNavigation.NavigationItem href="/">
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
