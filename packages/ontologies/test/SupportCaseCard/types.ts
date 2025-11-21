/**
 * Type definitions for SupportCaseCard component
 * Following TypeScript strong typing standards (typescript/typing/strong-typing)
 */

/**
 * User type for assignee information
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

/**
 * Case status using const assertion pattern (typescript/typing/enums)
 */
export const CaseStatus = {
  OPEN: 'open',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  AWAITING_CUSTOMER: 'awaiting_customer',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
} as const;

export type CaseStatusType = typeof CaseStatus[keyof typeof CaseStatus];

/**
 * Case priority levels
 */
export const CasePriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type CasePriorityType = typeof CasePriority[keyof typeof CasePriority];

/**
 * Display variants for the card component
 */
export const CardVariant = {
  COMPACT: 'compact',
  STANDARD: 'standard',
  EXPANDED: 'expanded'
} as const;

export type CardVariantType = typeof CardVariant[keyof typeof CardVariant];

/**
 * Props interface for SupportCaseCard component
 * Following component/architecture/props-interface standard
 */
export interface SupportCaseCardProps {
  /** Unique identifier for the support case */
  caseId: string;

  /** Title or subject of the support case */
  title: string;

  /** Brief description of the issue (optional) */
  description?: string;

  /** Current status of the case */
  status: CaseStatusType;

  /** Priority level of the case */
  priority: CasePriorityType;

  /** User assigned to handle the case (optional) */
  assignee?: User;

  /** Customer who created the case */
  customer: User;

  /** Date when the case was created */
  createdDate: Date;

  /** Date of last update to the case */
  lastUpdated: Date;

  /** Display variant of the card */
  variant?: CardVariantType;

  /** Tags or labels associated with the case */
  tags?: string[];

  /** Number of messages in the case thread */
  messageCount?: number;

  /** Whether the case has unread messages */
  hasUnreadMessages?: boolean;

  /** Click handler for the card */
  onClick?: (caseId: string) => void;

  /** Handler for status change */
  onStatusChange?: (caseId: string, newStatus: CaseStatusType) => void;

  /** Handler for priority change */
  onPriorityChange?: (caseId: string, newPriority: CasePriorityType) => void;

  /** Additional CSS classes */
  className?: string;

  /** Test ID for testing */
  testId?: string;
}

/**
 * Props for the CasePriorityIndicator subcomponent
 */
export interface CasePriorityIndicatorProps {
  priority: CasePriorityType;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Props for the CaseStatusBadge component
 */
export interface CaseStatusBadgeProps {
  status: CaseStatusType;
  variant?: 'pill' | 'square' | 'dot';
  size?: 'small' | 'medium' | 'large';
}

/**
 * Utility type for status colors
 */
export const StatusColors: Record<CaseStatusType, string> = {
  [CaseStatus.OPEN]: '#0066cc',
  [CaseStatus.PENDING]: '#f0ad4e',
  [CaseStatus.IN_PROGRESS]: '#5bc0de',
  [CaseStatus.AWAITING_CUSTOMER]: '#777',
  [CaseStatus.RESOLVED]: '#5cb85c',
  [CaseStatus.CLOSED]: '#333'
};

/**
 * Utility type for priority colors
 */
export const PriorityColors: Record<CasePriorityType, string> = {
  [CasePriority.LOW]: '#5cb85c',
  [CasePriority.MEDIUM]: '#f0ad4e',
  [CasePriority.HIGH]: '#d9534f',
  [CasePriority.CRITICAL]: '#721c24'
};