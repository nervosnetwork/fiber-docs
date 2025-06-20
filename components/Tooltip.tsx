"use client"

import React, { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      let x = 0;
      let y = 0;

      switch (position) {
        case "top":
          x = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          y = triggerRect.top + scrollY - tooltipRect.height - 8;
          break;
        case "bottom":
          x = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          y = triggerRect.bottom + scrollY + 8;
          break;
        case "left":
          x = triggerRect.left + scrollX - tooltipRect.width - 8;
          y = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          break;
        case "right":
          x = triggerRect.right + scrollX + 8;
          y = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          break;
      }

      // Ensure tooltip stays within viewport
      const margin = 8;
      x = Math.max(margin, Math.min(x, window.innerWidth - tooltipRect.width - margin));
      y = Math.max(margin, Math.min(y, window.innerHeight - tooltipRect.height - margin));

      setTooltipPosition({ x, y });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
      
      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isVisible, position]);

  const getArrowClasses = () => {
    const baseClasses = "absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45";
    
    switch (position) {
      case "top":
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2`;
      case "bottom":
        return `${baseClasses} -top-1 left-1/2 -translate-x-1/2`;
      case "left":
        return `${baseClasses} -right-1 top-1/2 -translate-y-1/2`;
      case "right":
        return `${baseClasses} -left-1 top-1/2 -translate-y-1/2`;
      default:
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2`;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={`cursor-help ${className}`}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg shadow-lg border border-gray-700 dark:border-gray-300 max-w-xs opacity-0 animate-fadeIn"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <div className={getArrowClasses()} />
          {content}
        </div>
      )}
    </>
  );
} 
