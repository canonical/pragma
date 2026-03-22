import type { Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";
import * as decorators from "storybook/decorators.js";
import Component from "./Choices.js";

const meta = {
  title: "Field/inputs/Choices",
  component: Component,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof Component>;

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
  args: {
    name: "ubuntu_version",
    label: "Choose your Ubuntu version",
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
    columns: 4,
  },
};

export const OperatingSystem: Story = {
  args: {
    name: "os",
    label: "Choose your operating system",
    options: [
      { value: "ubuntu", label: "Ubuntu" as React.ReactNode },
      { value: "debian", label: "Debian" as React.ReactNode },
      { value: "centos", label: "CentOS" as React.ReactNode },
      { value: "fedora", label: "Fedora" as React.ReactNode },
      { value: "arch", label: "Arch Linux" as React.ReactNode },
      { value: "alpine", label: "Alpine" as React.ReactNode },
    ],
    columns: 3,
  },
};

export const MultipleSelection: Story = {
  args: {
    name: "features",
    label: "Select features to install",
    isMultiple: true,
    options: [
      { value: "docker", label: "Docker" as React.ReactNode },
      { value: "kubernetes", label: "Kubernetes" as React.ReactNode },
      { value: "microk8s", label: "MicroK8s" as React.ReactNode },
      { value: "lxd", label: "LXD" as React.ReactNode },
      { value: "juju", label: "Juju" as React.ReactNode },
      { value: "maas", label: "MAAS" as React.ReactNode },
    ],
    columns: 3,
  },
};

export const PartiallyDisabled: Story = {
  args: {
    name: "release_channel",
    label: "Release channel",
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
    columns: 4,
  },
};

export const TwoColumns: Story = {
  args: {
    name: "arch",
    label: "Target architecture",
    options: [
      { value: "amd64", label: "AMD64 / x86_64" as React.ReactNode },
      { value: "arm64", label: "ARM64 / AArch64" as React.ReactNode },
      { value: "riscv64", label: "RISC-V 64" as React.ReactNode },
      { value: "s390x", label: "s390x (IBM Z)" as React.ReactNode },
    ],
    columns: 2,
  },
};

export const Disabled: Story = {
  args: {
    name: "os_disabled",
    label: "Operating system (disabled)",
    disabled: true,
    options: [
      { value: "ubuntu", label: "Ubuntu" as React.ReactNode },
      { value: "debian", label: "Debian" as React.ReactNode },
    ],
    columns: 2,
  },
};
