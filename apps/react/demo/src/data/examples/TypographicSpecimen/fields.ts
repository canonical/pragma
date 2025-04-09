import type {
  ExampleControlFieldOpts,
  ExampleSettingValue,
} from "../../../ui/index.js";
import {
  FONT_FAMILY_FIELD,
  FONT_SIZE_FIELD,
  LINE_HEIGHT_FIELD,
} from "../../fields.js";

// TBD is it better to keep common transformers like this in some constants/utils file, to separately declare them in each field, or some other way?
const REM_TRANSFORMER = (value: ExampleSettingValue) => `${value}rem`;
const PX_TRANSFORMER = (value: ExampleSettingValue) => `${value}px`;

const TYPO_SPECIMEN_FONT_FAMILY_FIELD: ExampleControlFieldOpts = {
  ...FONT_FAMILY_FIELD,
  defaultValue: "Times New Roman",
};

const fields: ExampleControlFieldOpts[] = [
  TYPO_SPECIMEN_FONT_FAMILY_FIELD,
  {
    ...FONT_SIZE_FIELD,
    min: 0.25,
    max: 16,
    step: 0.125,
    defaultValue: 16,
    transformer: PX_TRANSFORMER,
    elementScopes: [
      {
        scopeName: "h1",
        min: 0.25,
        max: 12,
        step: 0.125,
        defaultValue: 4,
        transformer: REM_TRANSFORMER
      },
      {
        scopeName: "h2",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 3,
        transformer: REM_TRANSFORMER
      },
      {
        scopeName: "h3",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 3,
        transformer: REM_TRANSFORMER
      },
      {
        scopeName: "h4",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 1,
        transformer: REM_TRANSFORMER
      },
      {
        scopeName: "h5",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 1,
        transformer: REM_TRANSFORMER
      },
      {
        scopeName: "h6",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 1,
        transformer: REM_TRANSFORMER
      },
    ],
  },
  {
    ...LINE_HEIGHT_FIELD,
    elementScopes: [
      {
        scopeName: "h1",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 4,
      },
      {
        scopeName: "h2",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 3,
      },
      {
        scopeName: "h3",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 3,
      },
      {
        scopeName: "h4",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 1,
      },
      {
        scopeName: "h5",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 1,
      },
      {
        scopeName: "h6",
        min: 0.25,
        max: 8,
        step: 0.125,
        defaultValue: 1,
      },
    ],
  },
  {
    name: "margin-bottom",
    label: "Margin Bottom",
    inputType: "range",
    min: 0,
    max: 16,
    defaultValue: 0,
    step: 0.125,
    transformer: REM_TRANSFORMER,
    elementScopes: [
      {
        scopeName: "h1",
        min: 0.25,
        max: 16,
        step: 0.125,
        defaultValue: 12,
      },
      {
        scopeName: "h2",
        min: 0.25,
        max: 16,
        step: 0.125,
        defaultValue: 3,
      },
      {
        scopeName: "h3",
        min: 0.25,
        max: 16,
        step: 0.125,
        defaultValue: 3,
      },
      {
        scopeName: "h4",
        min: 0.25,
        max: 16,
        step: 0.125,
        defaultValue: 1.5,
      },
      {
        scopeName: "h5",
        min: 0.25,
        max: 16,
        step: 0.125,
        defaultValue: 1.5,
      },
      {
        scopeName: "h6",
        min: 0.25,
        max: 16,
        step: 0.125,
        defaultValue: 1.5,
      },
      {
        scopeName: "hr",
        min: 1,
        max: 16,
        step: 1,
        defaultValue: 7,
      },
    ],
  },
  {
    name: "margin-top",
    label: "Margin Top",
    inputType: "range",
    elementScopes: [
      {
        scopeName: "hr",
        min: 0,
        max: 16,
        step: 1,
        defaultValue: 0,
      },
    ],
    transformer: PX_TRANSFORMER,
  },
  {
    name: "height",
    label: "Height",
    inputType: "range",
    elementScopes: [
      {
        scopeName: "hr",
        min: 1,
        max: 16,
        step: 1,
        defaultValue: 1,
      },
    ],
    transformer: PX_TRANSFORMER,
  },
];

export default fields;
