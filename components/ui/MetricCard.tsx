'use client';

import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  valueColor?: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string | number;
    positive: boolean;
    direction?: 'up' | 'down';
    label?: string;
  };
  variant?: 'emerald' | 'rose' | 'blue' | 'purple' | 'amber';
  onClick?: () => void;
  clickableHint?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  valueColor,
  subtitle,
  icon: Icon,
  trend,
  variant = 'emerald',
  onClick,
  clickableHint,
}) => {
  const variantStyles = {
    emerald: {
      iconBg: 'rgba(5, 150, 105, 0.1)',
      iconColor: '#059669',
      hoverBorder: 'rgba(5, 150, 105, 0.4)',
    },
    rose: {
      iconBg: 'rgba(255, 59, 48, 0.1)',
      iconColor: '#ff3b30',
      hoverBorder: 'rgba(255, 59, 48, 0.4)',
    },
    blue: {
      iconBg: 'rgba(0, 113, 227, 0.1)',
      iconColor: '#0071e3',
      hoverBorder: 'rgba(0, 113, 227, 0.4)',
    },
    purple: {
      iconBg: 'rgba(88, 86, 214, 0.1)',
      iconColor: '#5856d6',
      hoverBorder: 'rgba(88, 86, 214, 0.4)',
    },
    amber: {
      iconBg: 'rgba(255, 149, 0, 0.1)',
      iconColor: '#ff9500',
      hoverBorder: 'rgba(255, 149, 0, 0.4)',
    },
  }[variant];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        backgroundColor: '#ffffff',
        border: '0.5px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '16px',
        padding: '1.35rem 1.45rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s cubic-bezier(0.25, 1, 0.5, 1)',
        position: 'relative',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.borderColor = variantStyles.hoverBorder;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)';
          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
        }
      }}
    >
      {/* Top Row: Icon + Title + Inspect Hint */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              backgroundColor: variantStyles.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: variantStyles.iconColor,
              flexShrink: 0,
            }}
          >
            <Icon size={17} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: '0.825rem', fontWeight: 500, color: '#86868b', whiteSpace: 'nowrap' }}>
            {title}
          </span>
        </div>

        {/* Just the chevron, so the title stays on one line; the hint shows on hover. */}
        {onClick && (
          <div
            title={clickableHint || 'Details'}
            aria-label={clickableHint || 'Details'}
            style={{ display: 'flex', alignItems: 'center', color: '#8e8e93', flexShrink: 0 }}
          >
            <ChevronRight size={15} />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div
        style={{
          fontSize: '1.9rem',
          fontWeight: 700,
          color:
            valueColor ||
            (typeof value === 'string' && value.startsWith('-')
              ? '#ef4444'
              : typeof value === 'string' && value.startsWith('+')
              ? '#059669'
              : '#1d1d1f'),
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
          marginBottom: '0.55rem',
        }}
      >
        {value}
      </div>

      {/* Bottom Trend or Subtitle */}
      {trend ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.785rem' }}>
          <span
            style={{
              fontWeight: 600,
              // Good or bad news, not the sign: expenses going up is shown in red.
              color: trend.positive ? '#059669' : '#ef4444',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.15rem',
            }}
          >
            {(trend.direction ?? (trend.positive ? 'up' : 'down')) === 'up' ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}
            {trend.value}
          </span>
          <span style={{ color: '#86868b' }}>
            {trend.label || 'from last month'}
          </span>
        </div>
      ) : subtitle ? (
        <div style={{ fontSize: '0.785rem', color: '#86868b' }}>{subtitle}</div>
      ) : null}
    </div>
  );
};
