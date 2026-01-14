'use client';

import { useState } from 'react';
import Image from 'next/image';

interface WorkSlide {
  label: string;
  description: string;
  image: string;
  mobileImage: string;
}

interface MobileWorkSliderProps {
  slides: WorkSlide[];
  className?: string;
}

export default function MobileWorkSlider({ slides, className = '' }: MobileWorkSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const currentSlide = slides[activeIndex];

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* 1. 导航栏 */}
      <div className="w-full p-4 bg-layer-02 border border-invisible inline-flex justify-between items-center">
        <button onClick={goToPrevious} className="w-4 h-4 relative">
          <Image src="/left.svg" alt="Previous" width={16} height={16} />
        </button>
        <div className="text-center justify-center text-primary text-lg font-normal font-['Atkinson_Hyperlegible'] leading-5">
          {currentSlide.label}
        </div>
        <button onClick={goToNext} className="w-4 h-4 relative">
          <Image src="/right.svg" alt="Next" width={16} height={16} />
        </button>
      </div>

      {/* 2. 文字 */}
      <div className="w-full  text-secondary text-body2">
        {currentSlide.description}
      </div>

      {/* 3. 图片 */}
      <div className="w-full">
        <Image
          src={currentSlide.mobileImage}
          alt={currentSlide.label}
          width={800}
          height={600}
          className="w-full"
        />
      </div>
    </div>
  );
}
