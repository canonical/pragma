import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import { PhoneField } from "./index.js";

// Field-tier stories: the phone input bound to react-hook-form, inside a form.
const meta = {
  title: "components/PhoneField",
  component: PhoneField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof PhoneField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "phone", label: "Phone number" },
};

export const WithDefaultCountry: Story = {
  args: { name: "phone_uk", label: "Phone (UK default)", defaultCountry: "GB" },
};

export const WithPreferredCountries: Story = {
  args: {
    name: "phone_preferred",
    label: "Phone (preferred countries)",
    preferredCountries: ["US", "GB", "CA"],
  },
};

export const StructuredValue: Story = {
  args: {
    name: "phone_structured",
    label: "Phone (structured value)",
    valueFormat: "structured",
  },
};

export const FlagDisplay: Story = {
  args: {
    name: "phone_flag",
    label: "Phone (flag display)",
    countryDisplay: "flag",
  },
};

/**
 * Opt into live display masking with `mask`: the national number is formatted
 * with the selected country's mask as you type (here US `(###) ###-####`). The
 * mask is cosmetic only — the submitted value is always raw digits, regardless
 * of `mask`.
 */
export const Masked: Story = {
  args: {
    name: "phone_masked",
    label: "Phone (masked)",
    defaultCountry: "US",
    mask: true,
  },
};

export const Disabled: Story = {
  args: { name: "phone_disabled", label: "Phone (disabled)", disabled: true },
};

/** Error state: touched + failing validation → the field shows `.danger` chrome + the error message. */
export const WithError = errorStory({
  name: "err_phone",
  label: "Phone number",
});
