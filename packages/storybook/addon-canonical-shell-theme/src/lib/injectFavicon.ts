import cofSvg from "../assets/cof_square.svg?inline";

export function injectFavicon() {
  const link = document.createElement("link");
  link.setAttribute("rel", "icon");
  link.setAttribute("href", cofSvg);
  link.setAttribute("type", "image/svg+xml");
  document.head.appendChild(link);
}
