'use client';

import { useState, useEffect, useRef } from 'react';

interface Tab {
  label: string;
  active?: boolean;
  content?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  className?: string;
}

export default function Tabs({ tabs, className = '' }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(
    tabs.findIndex(tab => tab.active) !== -1 ? tabs.findIndex(tab => tab.active) : 0
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const accumulatedDeltaRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const SCROLL_THRESHOLD = 50; // 累积滚动量达到此值时切换

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaY;
      
      // 向下滚动
      if (delta > 0) {
        if (activeIndex < tabs.length - 1) {
          e.preventDefault();
          
          if (!isTransitioningRef.current) {
            accumulatedDeltaRef.current += delta;
            
            if (accumulatedDeltaRef.current >= SCROLL_THRESHOLD) {
              isTransitioningRef.current = true;
              accumulatedDeltaRef.current = 0;
              
              setActiveIndex(prev => prev + 1);
              
              // 切换完成后重置状态
              setTimeout(() => {
                isTransitioningRef.current = false;
              }, 300);
            }
          }
        }
        // 如果已经是最后一个 tab，不阻止默认滚动，让页面继续向下滚动
      }
      // 向上滚动
      else if (delta < 0) {
        if (activeIndex > 0) {
          e.preventDefault();
          
          if (!isTransitioningRef.current) {
            accumulatedDeltaRef.current += delta;
            
            if (accumulatedDeltaRef.current <= -SCROLL_THRESHOLD) {
              isTransitioningRef.current = true;
              accumulatedDeltaRef.current = 0;
              
              setActiveIndex(prev => prev - 1);
              
              setTimeout(() => {
                isTransitioningRef.current = false;
              }, 300);
            }
          }
        }
        // 如果已经是第一个 tab，不阻止默认滚动，让页面继续向上滚动
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [activeIndex, tabs.length]);

  return (
    <div ref={containerRef} className={`w-full inline-flex flex-col justify-start items-start ${className}`}>
      {/* Tab Headers */}
      <div className="w-full inline-flex justify-start items-stretch">
        {tabs.map((tab, index) => (
          <div
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`flex-1 p-md border border-invisible inline-flex flex-col justify-center items-center cursor-pointer ${
              index === activeIndex ? 'bg-layer-02' : ''
            }`}
          >
            <div
              className={`self-stretch text-center justify-center flex flex-col text-h3 ${
                index === activeIndex ? 'text-primary' : 'text-tertiary'
              }`}
            >
              {tab.label}
            </div>
          </div>
        ))}
      </div>
      
      {/* Tab Content */}
      {tabs[activeIndex]?.content && (
        <div className="w-full py-lg bg-layer-02 border border-invisible flex flex-col gap-lg text-secondary text-body2">
          {tabs[activeIndex]?.content}
        </div>
      )}
    </div>
  );
}
