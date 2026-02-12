import fontsStyles from "../theme/fonts.css?raw";

export function injectFontsStyles() {
  const style = document.createElement("style");
  style.textContent = fontsStyles;
  document.head.appendChild(style);
}
