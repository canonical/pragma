/**
 * SupportCaseCard Component Implementation
 * Following React functional component standards (react/component/functional-components)
 * and component composition patterns (component/architecture/composition)
 */

import React, { useMemo } from 'react';
import {
  SupportCaseCardProps,
  CaseStatus,
  CasePriority,
  CardVariant,
  StatusColors,
  PriorityColors,
  CasePriorityIndicatorProps,
  CaseStatusBadgeProps
} from './types';
import styles from './SupportCaseCard.module.css';

/**
 * CasePriorityIndicator - Subcomponent for priority display
 * Following component composition standards
 */
const CasePriorityIndicator: React.FC<CasePriorityIndicatorProps> = ({
  priority,
  showLabel = true,
  size = 'medium'
}) => {
  const priorityColor = PriorityColors[priority];
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <div
      className={`${styles['priority-indicator']} ${styles[`priority-indicator--${size}`]}`}
      data-testid="case-priority-indicator"
    >
      <span
        className={styles['priority-indicator__dot']}
        style={{ backgroundColor: priorityColor }}
        aria-label={`Priority: ${priorityLabel}`}
      />
      {showLabel && (
        <span className={styles['priority-indicator__label']}>
          {priorityLabel}
        </span>
      )}
    </div>
  );
};

/**
 * CaseStatusBadge - Component for status display
 * Following component composition standards
 */
const CaseStatusBadge: React.FC<CaseStatusBadgeProps> = ({
  status,
  variant = 'pill',
  size = 'medium'
}) => {
  const statusColor = StatusColors[status];
  const statusLabel = status.replace(/_/g, ' ').toUpperCase();

  return (
    <div
      className={`${styles['status-badge']} ${styles[`status-badge--${variant}`]} ${styles[`status-badge--${size}`]}`}
      style={{ backgroundColor: statusColor }}
      data-testid="case-status-badge"
    >
      <span className={styles['status-badge__text']}>
        {statusLabel}
      </span>
    </div>
  );
};

/**
 * UserAvatar - Subcomponent for user display
 * Can be used standalone as per ontology definition
 */
export const UserAvatar: React.FC<{ user: SupportCaseCardProps['assignee']; size?: string }> = ({
  user,
  size = 'medium'
}) => {
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`${styles['user-avatar']} ${styles[`user-avatar--${size}`]}`}
      data-testid="user-avatar"
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className={styles['user-avatar__image']}
        />
      ) : (
        <span className={styles['user-avatar__initials']}>
          {initials}
        </span>
      )}
    </div>
  );
};

/**
 * Main SupportCaseCard Component
 * Following React functional component standards
 */
const SupportCaseCard: React.FC<SupportCaseCardProps> = ({
  caseId,
  title,
  description,
  status,
  priority,
  assignee,
  customer,
  createdDate,
  lastUpdated,
  variant = CardVariant.STANDARD,
  tags = [],
  messageCount = 0,
  hasUnreadMessages = false,
  onClick,
  onStatusChange,
  onPriorityChange,
  className = '',
  testId = 'support-case-card'
}) => {
  // Format dates for display
  const formattedCreatedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(createdDate);
  }, [createdDate]);

  const formattedLastUpdated = useMemo(() => {
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }, [lastUpdated]);

  // Handle card click
  const handleCardClick = () => {
    if (onClick) {
      onClick(caseId);
    }
  };

  // Render based on variant
  const renderCardContent = () => {
    switch (variant) {
      case CardVariant.COMPACT:
        return (
          <>
            <div className={styles['card__row']}>
              <span className={styles['card__id']}>#{caseId}</span>
              <CaseStatusBadge status={status} size="small" />
            </div>
            <h3 className={styles['card__title']}>{title}</h3>
            <div className={styles['card__meta']}>
              <CasePriorityIndicator priority={priority} size="small" showLabel={false} />
              <span className={styles['card__date']}>{formattedLastUpdated}</span>
            </div>
          </>
        );

      case CardVariant.EXPANDED:
        return (
          <>
            <div className={styles['card__header']}>
              <div className={styles['card__header-left']}>
                <span className={styles['card__id']}>Case #{caseId}</span>
                <CaseStatusBadge status={status} />
              </div>
              <div className={styles['card__header-right']}>
                <CasePriorityIndicator priority={priority} />
              </div>
            </div>

            <h3 className={styles['card__title']}>{title}</h3>

            {description && (
              <p className={styles['card__description']}>{description}</p>
            )}

            <div className={styles['card__details']}>
              <div className={styles['card__detail-row']}>
                <span className={styles['card__label']}>Customer:</span>
                <div className={styles['card__user']}>
                  <UserAvatar user={customer} size="small" />
                  <span>{customer.name}</span>
                </div>
              </div>

              {assignee && (
                <div className={styles['card__detail-row']}>
                  <span className={styles['card__label']}>Assigned to:</span>
                  <div className={styles['card__user']}>
                    <UserAvatar user={assignee} size="small" />
                    <span>{assignee.name}</span>
                  </div>
                </div>
              )}

              <div className={styles['card__detail-row']}>
                <span className={styles['card__label']}>Created:</span>
                <span>{formattedCreatedDate}</span>
              </div>

              <div className={styles['card__detail-row']}>
                <span className={styles['card__label']}>Last Updated:</span>
                <span>{formattedLastUpdated}</span>
              </div>
            </div>

            {tags.length > 0 && (
              <div className={styles['card__tags']}>
                {tags.map((tag, index) => (
                  <span key={index} className={styles['card__tag']}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className={styles['card__footer']}>
              <div className={styles['card__messages']}>
                <span className={styles['card__message-count']}>
                  {messageCount} message{messageCount !== 1 ? 's' : ''}
                </span>
                {hasUnreadMessages && (
                  <span className={styles['card__unread-indicator']}>
                    New
                  </span>
                )}
              </div>
            </div>
          </>
        );

      case CardVariant.STANDARD:
      default:
        return (
          <>
            <div className={styles['card__header']}>
              <span className={styles['card__id']}>#{caseId}</span>
              <CaseStatusBadge status={status} size="small" />
            </div>

            <h3 className={styles['card__title']}>{title}</h3>

            {description && (
              <p className={styles['card__description']}>{description}</p>
            )}

            <div className={styles['card__meta']}>
              <CasePriorityIndicator priority={priority} size="small" />
              <div className={styles['card__meta-right']}>
                {assignee && <UserAvatar user={assignee} size="small" />}
                <span className={styles['card__date']}>{formattedLastUpdated}</span>
              </div>
            </div>

            {hasUnreadMessages && (
              <div className={styles['card__notification']}>
                <span className={styles['card__unread-indicator']}>
                  New messages
                </span>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <article
      className={`${styles['card']} ${styles[`card--${variant}`]} ${className}`}
      onClick={handleCardClick}
      data-testid={testId}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
      aria-label={`Support case ${caseId}: ${title}`}
    >
      {renderCardContent()}
    </article>
  );
};

export default SupportCaseCard;