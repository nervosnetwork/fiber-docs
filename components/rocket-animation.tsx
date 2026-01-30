'use client';

import React, { useState, useEffect, useRef } from 'react';
export default function App() {
  const [stage, setStage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when component enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the component is visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isVisible]);

  // Animation sequence - only starts when component is visible
  useEffect(() => {
    if (!isVisible) return;

    const sequence = async () => {
      // Stage 0: Reveal Top 2 Cards
      await new Promise(r => setTimeout(r, 100));
      setStage(1);
      
      // Stage 2: Draw Top Vertical Lines (Down from top cards)
      await new Promise(r => setTimeout(r, 800));
      setStage(2);

      // Stage 3: Draw Top Horizontal Connector (Connects the two verticals)
      await new Promise(r => setTimeout(r, 600));
      setStage(3);

      // Stage 4: Draw Top Central Dropper (Down to middle card)
      await new Promise(r => setTimeout(r, 400));
      setStage(4);

      // Stage 5: Reveal Middle Card
      await new Promise(r => setTimeout(r, 400));
      setStage(5);

      // Stage 6: Draw Bottom Central Stem
      await new Promise(r => setTimeout(r, 800));
      setStage(6);

      // Stage 7: Draw Bottom Horizontal Bar
      await new Promise(r => setTimeout(r, 600));
      setStage(7);

      // Stage 8: Draw Bottom Droppers
      await new Promise(r => setTimeout(r, 600));
      setStage(8);

      // Stage 9: Reveal Bottom 3 Cards
      await new Promise(r => setTimeout(r, 400));
      setStage(9);
    };

    sequence();
  }, [isVisible]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full  text-zinc-100 font-sans flex flex-col items-center justify-center overflow-x-hidden overflow-y-hidden"
    >
      
      {/* --- LEVEL 1: TOP CARDS (Fiber & Lightning) --- */}
      <div className="flex gap-[20px] md:gap-[40px] mb-0 z-20" style={{ width: 'calc(100%)' }}>
        
        {/* Card 1: Fiber Network */}
        <div className={`transition-all duration-700 transform flex-1 ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="w-full p-lg border border-dashed border-invisible inline-flex flex-col justify-center items-center gap-xs">
            <img src="/logo-s.svg" alt="Fiber Network" className="w-6 h-6" />
            <div className="text-primary text-h4">Fiber Network</div>
          </div>
        </div>

        {/* Card 2: Lightning Network */}
        <div className={`transition-all duration-700 delay-100 transform flex-1 ${stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="w-full p-lg border border-dashed border-invisible inline-flex flex-col justify-center items-center gap-xs">
            <img src="/lightning.svg" alt="Lightning Network" className="w-6 h-6" />
            <div className="text-primary text-h4">Lightning Network</div>
          </div>
        </div>

      </div>

      {/* --- CONNECTOR 1: Y-SHAPE MERGE --- */}
      <div className="relative h-20 md:h-40 w-full">
        
        {/* Top Vertical Lines */}
        <div className="absolute top-0 left-0 w-full flex justify-between" style={{ paddingLeft: 'calc((100% - 20px) / 4)', paddingRight: 'calc((100% - 20px) / 4)' }}>
           {/* Left Line */}
           <div className={`w-[1px] bg-[#F2F2F2] transition-all duration-500 ease-linear ${stage >= 2 ? 'h-10 md:h-20 opacity-100' : 'h-0 opacity-0'}`}></div>
           {/* Right Line */}
           <div className={`w-[1px] bg-[#F2F2F2] transition-all duration-500 ease-linear ${stage >= 2 ? 'h-10 md:h-20 opacity-100' : 'h-0 opacity-0'}`}></div>
        </div>

        {/* Horizontal Connector */}
        <div className={`absolute top-10 md:top-20 h-[1px] bg-[#F2F2F2] transition-all duration-500 ease-out ${
          stage >= 3 ? 'opacity-100' : 'opacity-0'
        }`} style={{ left: 'calc((100% - 20px) / 4)', right: 'calc((100% - 20px) / 4)', width: stage >= 3 ? 'calc(100% - (100% - 20px) / 2)' : '0' }}></div>

        {/* Center Dropper to Middle Card */}
        <div className={`absolute top-10 md:top-20 left-1/2 -translate-x-1/2 w-[1px] bg-[#F2F2F2] transition-all duration-500 ease-linear ${
          stage >= 4 ? 'h-10 md:h-20 opacity-100' : 'h-0 opacity-0'
        }`}></div>

      </div>

      {/* --- LEVEL 2: MIDDLE CARD (Hybrid Network) --- */}
      <div className="relative z-20 mb-0 w-full">
        <div className={`relative transition-all duration-700 transform ${stage >= 5 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Blinking Border Container */}
          <div className="relative w-full">
            {/* 第一组 - Group 1 */}
            {/* Top Border - Left Half */}
            <div className="absolute top-0 left-0 w-1/2 h-[1px] bg-gradient-to-r from-[#272727] to-[#F2F2F2] animate-border-blink-group1"></div>
            {/* Bottom Border - Right Half */}
            <div className="absolute bottom-0 right-0 w-1/2 h-[1px] bg-gradient-to-l from-[#272727] to-[#F2F2F2] animate-border-blink-group1"></div>
            {/* Left Border - Top Half */}
            <div className="absolute top-0 left-0 w-[1px] h-1/2 bg-gradient-to-b from-[#272727] to-[#F2F2F2] animate-border-blink-group1"></div>
            {/* Right Border - Bottom Half */}
            <div className="absolute bottom-0 right-0 w-[1px] h-1/2 bg-gradient-to-t from-[#272727] to-[#F2F2F2] animate-border-blink-group1"></div>
            
            {/* 第二组 - Group 2 */}
            {/* Top Border - Right Half */}
            <div className="absolute top-0 right-0 w-1/2 h-[1px] bg-gradient-to-l from-[#272727] to-[#F2F2F2] animate-border-blink-group2"></div>
            {/* Bottom Border - Left Half */}
            <div className="absolute bottom-0 left-0 w-1/2 h-[1px] bg-gradient-to-r from-[#272727] to-[#F2F2F2] animate-border-blink-group2"></div>
            {/* Left Border - Bottom Half */}
            <div className="absolute bottom-0 left-0 w-[1px] h-1/2 bg-gradient-to-t from-[#272727] to-[#F2F2F2] animate-border-blink-group2"></div>
            {/* Right Border - Top Half */}
            <div className="absolute top-0 right-0 w-[1px] h-1/2 bg-gradient-to-b from-[#272727] to-[#F2F2F2] animate-border-blink-group2"></div>
            
            <div className="bg-[#080808] p-8 w-full flex flex-col items-center text-center">
              <div className="w-96 text-center justify-center">
                <span className="text-primary text-display">Hybrid</span>
              </div>
              <div className="w-200 text-center justify-center">
                <span className="text-tertiary text-display">Lightning Network</span>
              </div>
            </div>
          </div>
        </div>
      </div>

         {/* --- LEVEL 3: BOTTOM CARDS --- */}
      <div className="flex flex-col md:flex-row w-full items-stretch">
        
        {/* Card 1: Stablecoin */}
        <div className={`transition-all duration-700 delay-0 transform flex-1 ${stage >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20'}`}>
          <div className="h-full px-lg py-lg border-l border-t border-b border-r border-invisible inline-flex flex-col justify-center items-start gap-md w-full">
            <div className="text-primary text-h3">Stablecoin Support</div>
            <div className="self-stretch">
              <span className="text-tertiary text-body2">RGB++ Stablecoins</span>
              <span className="text-tertiary text-body2"> can seamlessly enter the Hybrid Lightning Network.</span>
            </div>
          </div>
        </div>

        {/* Card 2: Atomic Swaps */}
        <div className={`transition-all duration-700 delay-150 transform flex-1 ${stage >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20'}`}>
          <div className="h-full px-lg py-lg border-t border-b border-r border-invisible inline-flex flex-col justify-center items-start gap-md w-full">
            <div className="text-primary text-h3">Cross-Network Atomic Swaps</div>
            <div className="self-stretch">
              <span className="text-tertiary text-body2">Edge nodes enable secure, instant exchanges across Lightning and Fiber networks.</span>
            </div>
          </div>
        </div>

        {/* Card 3: Network Enhancement */}
        <div className={`transition-all duration-700 delay-300 transform flex-1 ${stage >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20'}`}>
          <div className="h-full px-lg py-lg border-t border-b border-r border-invisible inline-flex flex-col justify-center items-start gap-md w-full">
            <div className="text-primary text-h3">Network Enhancement</div>
            <div className="self-stretch">
              <span className="text-tertiary text-body2">The combined infrastructure improves network connectivity and boosts overall liquidity.</span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
        @keyframes border-blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-border-blink-group1 {
          animation: border-blink 2s ease-in-out infinite;
        }
        .animate-border-blink-group2 {
          animation: border-blink 2s ease-in-out infinite 1s;
        }
      `}</style>
      
      {/* <button 
        onClick={() => { setStage(0); setTimeout(() => window.location.reload(), 10); }}
        className={`fixed bottom-8 right-8 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs hover:text-white hover:border-zinc-700 transition-all ${stage >= 6 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        Replay
      </button> */}
    </div>
  );
}