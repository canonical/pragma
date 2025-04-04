import type { ExampleSettingValue } from "../../ui/index.js";

export const REM_TRANSFORMER = (val: ExampleSettingValue) => `${val}rem`;
export const PX_TRANSFORMER = (val: ExampleSettingValue) => `${val}px`;
export const PERCENT_TRANSFORMER = (val: ExampleSettingValue) => `${val}%`;
export const EM_TRANSFORMER = (val: ExampleSettingValue) => `${val}em`;
export const VW_TRANSFORMER = (val: ExampleSettingValue) => `${val}vw`;
export const VH_TRANSFORMER = (val: ExampleSettingValue) => `${val}vh`;
