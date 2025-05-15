import React from "react";
import type { FieldProps } from "../Field/index.js";
import Field from "../Field/Field.js";
import { Button } from "@canonical/react-ds-core";
import FormWrapper from "./FormWrapper.js";
import addDynamicMinimumAge from "../middleware/addDynamicMinimumAge.js";

const MyForm = () => {
  const fields: FieldProps[] = [
    {
      name: "name",
      inputType: "text",
      label: "Name",
      registerProps: {
        required: {
          value: true,
          message: "Name is required",
        },
      },
    },
    {
      name: "age",
      inputType: "number",
      label: "Age",
      registerProps: {
        required: {
          value: true,
          message: "Age is required",
        },
        min: {
          value: 21,
          message: "Age must be at least 21",
        },
      },
      middleware: [addDynamicMinimumAge("country")],
    },
    {
      name: "country",
      inputType: "select",
      label: "Country",
      options: [
        { value: "USA", label: "United States" },
        { value: "CAN", label: "Canada" },
        { value: "MEX", label: "Mexico" },
      ],
    },
    {
      name: "comments",
      inputType: "textarea",
      label: "Comments",
      registerProps: {
        required: {
          value: true,
          message: "Comments are required",
        },
      },
    },
  ];
  return (
    <FormWrapper>
      {fields.map((fieldProps) => (
        <Field key={fieldProps.name} {...fieldProps} />
      ))}
      <div>
        <Button appearance={"positive"}>Submit</Button>
      </div>
    </FormWrapper>
  );
};

export default MyForm;
