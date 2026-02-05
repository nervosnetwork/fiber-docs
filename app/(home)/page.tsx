'use client';

import { useState, useEffect } from 'react';
import TransactionPathVisualizer from '@/components/transaction-path-visualizer';
import HeroTitle from '@/components/hero-title';
import NetworkStats from '@/components/network-stats';
import HowItWorks from '@/components/how-it-works';
import LiveSimulation from '@/components/live-simulation';
import NetworkComparison from '@/components/network-comparison';
import RocketAnimationSection from '@/components/rocket-animation-section';
import HighlightedFeatures from '@/components/highlighted-features';
import FAQ from '@/components/faq';
import Timeline from '@/components/timeline';
import FeaturedProjects from '@/components/featured-projects';

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="relative">
      {/* Transaction Path Visualizer - positioned at top right below header */}
      <div className="absolute top-10 right-0 z-10">
        <TransactionPathVisualizer />
      </div>
      
      <main className="flex flex-col p-4 md:p-10">
        <HeroTitle />
        <NetworkStats />
        <HowItWorks />
        <LiveSimulation />
        <NetworkComparison />
        <RocketAnimationSection />
        <HighlightedFeatures />
        <FAQ />
        <Timeline />
        <FeaturedProjects />
      </main>
    </div>
  );
}
