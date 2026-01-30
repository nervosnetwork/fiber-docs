'use client';

import { useState } from 'react';

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

  return (
    <div className={`w-full inline-flex flex-col justify-start items-start ${className}`}>
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
