declare module "*.css" {
  import type { CSSResult } from "lit";
  const styles: CSSResult;
  export default styles;
}
