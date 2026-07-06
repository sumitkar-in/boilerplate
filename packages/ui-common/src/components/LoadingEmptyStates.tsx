import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label }) => {
  return (
    <div className="ui-loading">
      <div className={`ui-loading__spinner ui-loading__spinner--${size}`} />
      {label && <span className="ui-loading__label">{label}</span>}
    </div>
  );
};

export interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '20px', borderRadius = '6px', style }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--border, #e2e8f0)',
        opacity: 0.6,
        ...style,
      }}
    />
  );
};

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  // Extra classes appended after "empty-state" (e.g. "card empty-state--spacious")
  // — lets a consuming app layer its own visual variants without ui-common
  // needing to know their names.
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon, className }) => {
  return (
    <div className={className ? `empty-state ${className}` : 'empty-state'}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
};
