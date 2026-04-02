import type React from "react";

export interface CardProps {
  /** Card title displayed in the header bar. */
  readonly title: string;
  /** Domain name — indexes into DOMAIN_COLORS for the title color. */
  readonly domain: string;
  /** Optional badge text displayed right-aligned in the header (e.g., "[1 of 2]"). */
  readonly badge?: string;
  /** Card body content. */
  readonly children: React.ReactNode;
}
