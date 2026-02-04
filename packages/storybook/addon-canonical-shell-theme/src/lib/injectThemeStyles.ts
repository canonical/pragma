import themeStyles from "../theme/styles.css?raw";

export function injectThemeStyles() {
  const style = document.createElement("style");
  style.textContent = themeStyles;
  document.head.appendChild(style);
}
