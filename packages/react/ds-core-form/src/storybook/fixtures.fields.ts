import * as options from "./fixtures.options.js";

export const base = [
	{
		name: "text_field",
		inputType: "text",
		label: "Text Field",
		placeholder: "Name",
	},
	{
		name: "email_field",
		inputType: "email",
		label: "Email Field",
		placeholder: "my@email.com",
	},
	{
		name: "password_field",
		inputType: "password",
		label: "Password Field",
		placeholder: "abcdef",
	},
	{ name: "checkbox_field", inputType: "checkbox", label: "Checkbox Field" },
	{
		name: "select_field",
		inputType: "select",
		label: "Select an option",
		options: options.fruits,
	},
	{
		name: "range_field",
		inputType: "range",
		label: "Quantity to order",
		min: 1,
		max: 100,
	},
	{
		name: "textarea",
		inputType: "textarea",
		label: "Write your message",
		placeholder: "Type your message here",
	},
	{
		name: "simple_choices_single",
		inputType: "simple-choices",
		label: "Choose a continent",
		options: options.continents,
	},
	{
		name: "simple_choices_multiple",
		inputType: "simple-choices",
		label: "Choose multiple continents",
		isMultiple: true,
		options: options.continents,
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
