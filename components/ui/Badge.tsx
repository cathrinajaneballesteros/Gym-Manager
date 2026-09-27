import React from 'react';

export type BadgeVariant =
  | 'active'
  | 'expiring'
  | 'expired'
  | 'inactive'
  | 'completed'
  | 'pending'
  | 'refunded'
  | 'ai'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant | string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  return <span className={`badge badge-${variant}`}>{children}</span>;
};
