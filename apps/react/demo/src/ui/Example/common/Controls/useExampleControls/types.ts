import type { ChangeEvent } from "react";

export type UseExampleControlsResult = {
  handleFontFamilyChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  handleFontSizeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleLineHeightChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleCopyCss: () => void;
  handlePrevExample: () => void;
  handleNextExample: () => void;
};
