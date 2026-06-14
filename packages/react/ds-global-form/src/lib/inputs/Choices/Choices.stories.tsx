import type { Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";
import { useState } from "react";
import { Choices } from "./Choices.js";

// Presentational stories: Choices is controlled directly, no form.
const meta = {
  title: "Inputs/Choices",
  component: Choices,
  tags: ["autodocs"],
} satisfies Meta<typeof Choices>;

export default meta;

type Story = StoryObj<typeof meta>;

const VersionCard = ({
  version,
  codename,
  lts,
}: {
  version: string;
  codename: string;
  lts?: boolean;
}) => (
  <>
    <strong>
      Ubuntu {version} {lts && <span style={{ opacity: 0.6 }}>LTS</span>}
    </strong>
    <span style={{ fontSize: "0.85em", opacity: 0.7 }}>{codename}</span>
  </>
);

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>();
    return <Choices {...args} value={value} onChange={setValue} />;
  },
  args: {
    name: "ubuntu_version",
    options: [
      {
        value: "24.04",
        label: (
          <VersionCard version="24.04" codename="Noble Numbat" lts />
        ) as React.ReactNode,
      },
      {
        value: "23.10",
        label: (
          <VersionCard version="23.10" codename="Mantic Minotaur" />
        ) as React.ReactNode,
      },
      {
        value: "22.04",
        label: (
          <VersionCard version="22.04" codename="Jammy Jellyfish" lts />
        ) as React.ReactNode,
      },
      {
        value: "20.04",
        label: (
          <VersionCard version="20.04" codename="Focal Fossa" lts />
        ) as React.ReactNode,
      },
    ],
  },
};

export const MultipleSelection: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>([]);
    return <Choices {...args} value={value} onChange={setValue} />;
  },
  args: {
    name: "features",
    isMultiple: true,
    options: [
      { value: "docker", label: "Docker" as React.ReactNode },
      { value: "kubernetes", label: "Kubernetes" as React.ReactNode },
      { value: "microk8s", label: "MicroK8s" as React.ReactNode },
      { value: "lxd", label: "LXD" as React.ReactNode },
    ],
  },
};

export const PartiallyDisabled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>();
    return <Choices {...args} value={value} onChange={setValue} />;
  },
  args: {
    name: "release_channel",
    options: [
      { value: "stable", label: "Stable" as React.ReactNode },
      { value: "candidate", label: "Candidate" as React.ReactNode },
      {
        value: "beta",
        label: "Beta (unavailable)" as React.ReactNode,
        disabled: true,
      },
      {
        value: "edge",
        label: "Edge (unavailable)" as React.ReactNode,
        disabled: true,
      },
    ],
  },
};

export const Disabled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>();
    return <Choices {...args} value={value} onChange={setValue} />;
  },
  args: {
    name: "os_disabled",
    disabled: true,
    options: [
      { value: "ubuntu", label: "Ubuntu" as React.ReactNode },
      { value: "debian", label: "Debian" as React.ReactNode },
    ],
  },
};
