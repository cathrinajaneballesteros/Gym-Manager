'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number; // Delay in milliseconds
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number; // Distance in pixels (default: 20)
  duration?: number; // Duration in ms (default: 480)
  blur?: boolean;
  className?: string;
  style?: React.CSSProperties;
  threshold?: number;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 20,
  duration = 480,
  blur = true,
  className = '',
  style = {},
  threshold = 0.05,
  once = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Check if element is already in viewport on mount (above the fold)
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const isAlreadyInViewport = rect.top < windowHeight && rect.bottom > 0;

    if (isAlreadyInViewport) {
      const timer = setTimeout(() => setIsVisible(true), 30);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold: Math.min(threshold, 0.05),
        rootMargin: '0px 0px -25px 0px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once, delay]);

  const getInitialTransform = () => {
    switch (direction) {
      case 'up':
        return `translateY(${distance}px)`;
      case 'down':
        return `translateY(-${distance}px)`;
      case 'left':
        return `translateX(${distance}px)`;
      case 'right':
        return `translateX(-${distance}px)`;
      case 'none':
      default:
        return 'none';
    }
  };

  return (
    <div
      ref={elementRef}
      className={`scroll-reveal-container ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0, 0)' : getInitialTransform(),
        filter: blur ? (isVisible ? 'blur(0px)' : 'blur(8px)') : 'none',
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, filter ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform, filter',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
