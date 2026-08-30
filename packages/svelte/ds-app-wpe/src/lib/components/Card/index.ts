import CardRoot from "./Card.svelte";
import { Content, Footer, Header, Image } from "./common/index.js";

const Card = CardRoot as typeof CardRoot & {
  Content: typeof Content;
  Footer: typeof Footer;
  Header: typeof Header;
  Image: typeof Image;
};
Card.Content = Content;
Card.Footer = Footer;
Card.Header = Header;
Card.Image = Image;

export type {
  ContentProps,
  FooterProps,
  HeaderProps,
  ImageProps,
} from "./common/index.js";
export type { CardProps } from "./types.js";
export { Card };
