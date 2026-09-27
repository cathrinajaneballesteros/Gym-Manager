'use client';

import React from 'react';
import { AppleNavbar } from '@/components/landing/AppleNavbar';
import { AppleHero } from '@/components/landing/AppleHero';
import { InteractiveProductShowcase } from '@/components/landing/InteractiveProductShowcase';
import { BentoFeatures } from '@/components/landing/BentoFeatures';
import { PerformanceMetrics } from '@/components/landing/PerformanceMetrics';
import { PricingSection } from '@/components/landing/PricingSection';
import { BottomCtaSection } from '@/components/landing/BottomCtaSection';
import { AppleFooter } from '@/components/landing/AppleFooter';

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#fbfbfd',
        color: '#1d1d1f',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        position: 'relative',
      }}
      className="landing-page-container"
    >
      {/* 1. Floating Apple Translucent Glass Navigation Bar */}
      <AppleNavbar />

      <main style={{ flex: 1 }}>
        {/* 2. Apple Hero Section with Interactive Mockup */}
        <AppleHero />

        {/* 3. Three Pillars of Machine Intelligence Showcase */}
        <InteractiveProductShowcase />

        {/* 4. Asymmetric Bento Grid Architecture */}
        <BentoFeatures />

        {/* 5. Understated Typography Stats & Numbers */}
        <PerformanceMetrics />

        {/* 6. Clean Minimalist Pricing with Annual Discount Toggle */}
        <PricingSection />

        {/* 7. Expansive Cinematic Bottom Glass Panel */}
        <BottomCtaSection />
      </main>

      {/* 8. Understated Apple Footer */}
      <AppleFooter />
    </div>
  );
}
