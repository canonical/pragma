import type { EntityAside_component$key } from "#relay/__generated__/EntityAside_component.graphql.js";

export interface EntityAsideProps {
  /** Additional CSS class names. */
  className?: string;
  /** Fragment ref of the component whose quick facts this aside lists. */
  readonly component: EntityAside_component$key;
}
