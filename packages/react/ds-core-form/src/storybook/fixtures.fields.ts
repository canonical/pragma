import * as options from "./fixtures.options.js";

export const base = [
  {
    name: "text_field",
    inputType: "text",
    label: "Text Field",
    description: "This is a text field",
    placeholder: "Name",
  },
  {
    name: "email_field",
    inputType: "email",
    label: "Email Field",
    description: "This is an email field",
    placeholder: "my@email.com",
  },
  {
    name: "password_field",
    inputType: "password",
    label: "Password Field",
    description: "This is a password field",
    placeholder: "abcdef",
  },
  {
    name: "checkbox_field",
    inputType: "checkbox",
    label: "Checkbox Field",
    description: "This is a checkbox field",
  },
  {
    name: "select_field",
    inputType: "select",
    label: "Select an option",
    description: "This is a select field",
    options: options.fruits,
  },
  {
    name: "range_field",
    inputType: "range",
    label: "Quantity to order",
    description: "This is a range field",
    min: 1,
    max: 100,
  },
  {
    name: "textarea",
    inputType: "textarea",
    label: "Write your message",
    description: "This is a textarea field",
    placeholder: "Type your message here",
  },
  {
    name: "simple_choices_single",
    inputType: "simple-choices",
    label: "Choose a continent",
    description: "This is a simple choices field",
    options: options.continents,
  },
  {
    name: "simple_choices_multiple",
    inputType: "simple-choices",
    label: "Choose multiple continents",
    description: "This is a simple choices field",
    isMultiple: true,
    options: options.continents,
  },
  {
    name: "telephone_field_area",
    inputType: "number",
    description: "This is a telephone field",
    label: "Area Code",
    className: "special-area",
  },
  {
    name: "telephone_field_number",
    inputType: "tel",
    description: "This is a telephone field",
    label: "Phone Number",
    className: "special-number",
  },
];

export const withDisabled = [
  { name: "text_field", inputType: "text", label: "Text Field" },
  {
    name: "email_field",
    inputType: "email",
    label: "Email Field",
    disabled: true,
  },
  { name: "password_field", inputType: "password", label: "Password Field" },
  {
    name: "checkbox_field",
    inputType: "checkbox",
    label: "Checkbox Field",
    disabled: true,
  },
];

export const phone = [
  {
    name: "telephone_field_area",
    inputType: "number",
    label: "Area Code",
    className: "special-width",
  },
  {
    name: "telephone_field_number",
    inputType: "tel",
    label: "Phone Number",
  },
];
