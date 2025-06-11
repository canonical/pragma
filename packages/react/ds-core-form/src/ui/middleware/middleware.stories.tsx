/* @canonical/generator-ds 0.9.0-experimental.9 */

import type { Meta, StoryObj } from "@storybook/react-vite";
// Needed for template-based story, safe to remove otherwise
import type { StoryFn } from "@storybook/react-vite";
import { http } from "msw";
// Needed for function-based story, safe to remove otherwise
// import type { FormProps } from './types.js'
import { useMemo } from "react";
import * as decorators from "storybook/decorators.js";
import * as fixtures from "storybook/fixtures.options.js";
import * as middleware from "./index.js";

import { Field } from "../Field/index.js";

const meta = {
  title: "middleware",
  decorators: [decorators.form()],
  component: Field,
  parameters: {
    docs: {
      description: {
        component:
          "Read the source of the stories in `middleware.stories.tsx` for the full code patterns.",
      },
    },
  },
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
// type Story = StoryObj<typeof meta>;

// export const Default: Story = {
//   args: {
//     children: <span>Hello world!</span>
//   },
// };

type TemplateProps = {
  wrapperClassName: string;
};

const Template: StoryFn<TemplateProps> = ({
  wrapperClassName,
}: TemplateProps) => <div className={wrapperClassName}>Test</div>;
export const Default: StoryFn<TemplateProps> = Template.bind({});
Default.args = {
  wrapperClassName: "wrapper",
};

// Story for addRESTOptions middleware
export const RESTOptions: Story = {
  args: {
    name: "optionsField",
    inputType: "select",
    middleware: [
      middleware.addRESTOptions("/api/options", {
        transformData: (data) => data.options,
      }),
    ],
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/options", () => {
          return new Response(
            JSON.stringify({
              options: fixtures.fruits,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }),
      ],
    },
  },
};

// Story for addRESTValidation middleware
export const RESTValidation: Story = {
  args: {
    name: "validationField",
    inputType: "text",
    description:
      "If the value entered equals the string `invalid`, the back-end validation should fail.",
    middleware: [middleware.addRESTValidation("/api/validate")],
  },
  parameters: {
    msw: {
      handlers: [
        http.post(
          "/api/validate",
          async ({ request }: { request: Request }): Promise<Response> => {
            const body = await request.json();
            const { value } = body as { value: string };
            if (value === "invalid") {
              return new Response(JSON.stringify({ error: "Invalid value" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }
            return new Response(null, { status: 200 });
          },
        ),
      ],
    },
  },
};

// export const RESTOptions: StoryObj = {
//   render: () => {
//     const choicesField: FieldProps = {
//       name: "choices",
//       inputType: "simple-choices",
//       label: "Select an option",
//       middleware: [
//         middleware.addRESTOptions("https://TODO", {
//           transformData: (data) => data.options,
//         }),
//       ],
//     };
//
//     return <Field {...choicesField} />;
//   },
//   name: "REST Options",
// };
//
// export const RESTValidation: StoryObj = {
//   render: () => {
//     const domainField: FieldProps = {
//       name: "domain",
//       inputType: "text",
//       label: "Domain Name",
//       middleware: [
//         middleware.addRESTValidation("https://TODO", {
//           minLength: 3,
//           errorExtractor: async (response) => {
//             const data = await response.json();
//             return data.error || "Domain is not available";
//           },
//         }),
//       ],
//     };
//
//     return <Field {...domainField} />;
//   },
//   name: "REST Validation",
// };
//
/*
  Function-based story
  Direct arguments passed to the component
  Simple, but can lead to repetition if used across multiple stories with similar configurations

  export const Default = (args: FormProps) => <Component {...args} />;
  Default.args = { children: <span>Hello world!</span> };
*/

/*
  Template-Based story
  Uses a template function to bind story variations, making it more reusable
  Slightly more boilerplate but more flexible for creating multiple stories with different configurations

  const Template: StoryFn<typeof Component> = (args) => <Component {...args} />;
  export const Default: StoryFn<typeof Component> = Template.bind({});
  Default.args = {
    children: <span>Hello world!</span>
  };
*/

/*
  Static story
  Simple and straightforward, but offers the least flexibility and reusability

  export const Default: StoryFn<typeof Component> = () => (
    <Component><span>Hello world!</span></Component>
  );
*/
