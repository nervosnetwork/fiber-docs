"use client";

import { useState } from "react";
import Image from "next/image";

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultExpandedIndex?: number;
}

export default function Accordion({ items, defaultExpandedIndex = 0 }: AccordionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(
    new Set([defaultExpandedIndex])
  );

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full flex flex-col justify-start items-start">
      {items.map((item, index) => {
        const isExpanded = expandedItems.has(index);
        return (
          <div
            key={index}
            data-expanded={isExpanded}
            className="w-full flex flex-col justify-start items-start"
          >
            <button
              onClick={() => toggleItem(index)}
              className="self-stretch p-md border border-invisible flex justify-between items-center w-full text-left transition-all duration-200 hover:bg-layer-02 cursor-pointer"
            >
              <div className="text-primary text-h2">{item.question}</div>
              <div className="w-8 h-8 relative flex-shrink-0 transition-transform duration-600">
                <Image
                  src={isExpanded ? "/minus.svg" : "/plus2.svg"}
                  alt={isExpanded ? "Collapse" : "Expand"}
                  fill
                  className="object-contain"
                />
              </div>
            </button>
            <div
              className={`self-stretch overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-md border border-invisible flex justify-start items-center">
                <div className="flex-1 text-tertiary text-body2">{item.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
