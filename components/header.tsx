'use client';

import { useState, useEffect, useRef } from 'react';
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <>
      <div className="w-full px-10 py-6 backdrop-blur-[0px] inline-flex justify-between items-center flex-wrap content-center relative z-[1000]" ref={menuRef}>
        <Link href="/" className="w-[188px] h-[29.5px] relative">
          <Image src="/logo.svg" alt="Logo" width={188} height={29.5} priority />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex justify-center items-center gap-5">
          <div className="flex justify-start items-center gap-5">
            <Link href="/docs" className="w-36 h-10 relative inline-flex flex-col justify-center items-center cursor-pointer group">
              <div className="justify-center text-primary text-sm font-normal font-['Inter'] uppercase leading-4">documentation</div>
              <div className="w-36 h-px absolute bottom-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/blog" className="w-28 h-10 relative inline-flex flex-col justify-center items-center cursor-pointer group">
              <div className="justify-center text-primary text-sm font-normal font-['Inter'] uppercase leading-4">BLOG</div>
              <div className="w-12 h-px absolute bottom-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/showcase" className="w-28 h-10 relative inline-flex flex-col justify-center items-center cursor-pointer group">
              <div className="justify-center text-primary text-sm font-normal font-['Inter'] uppercase leading-4">SHOWCASE</div>
              <div className="w-24 h-px absolute bottom-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
        
        {/* GitHub Button - Desktop */}
        <a href="https://github.com/nervosnetwork/fiber" target="_blank" rel="noopener noreferrer" className="hidden lg:flex w-48 h-10 flex-col justify-center items-end hover-invert cursor-pointer px-2">
          <div className="inline-flex justify-start items-center gap-2">
            <div className="w-[18px] h-[18px] relative">
              <Image src="/github.svg" alt="GitHub" width={18} height={18} />
            </div>
            <div className="inline-flex flex-col justify-start items-center">
              <div className="text-center justify-center text-primary text-xs font-bold font-['Inter'] uppercase leading-4">Contribute on Github</div>
            </div>
          </div>
        </a>

        {/* Tablet & Mobile: GitHub + Menu Toggle */}
        <div className="flex lg:hidden items-center gap-4">
          {/* GitHub Button - Tablet only */}
          <a href="https://github.com/nervosnetwork/fiber" target="_blank" rel="noopener noreferrer" className="hidden md:flex md:w-auto h-10 flex-col justify-center items-end hover-invert cursor-pointer px-2">
            <div className="inline-flex justify-start items-center gap-2">
              <div className="w-[18px] h-[18px] relative">
                <Image src="/github.svg" alt="GitHub" width={18} height={18} />
              </div>
              <div className="inline-flex flex-col justify-start items-center">
                <div className="text-center justify-center text-primary text-xs font-bold font-['Inter'] uppercase leading-4">Contribute on Github</div>
              </div>
            </div>
          </a>
          {/* Menu Toggle Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 cursor-pointer"
          >
            <Image 
              src={isMenuOpen ? "/close.svg" : "/menu.svg"} 
              alt="Menu" 
              width={32} 
              height={32} 
            />
          </button>
        </div>

        {/* Mobile & Tablet Dropdown Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full flex flex-col bg-[#0A0A0A] z-[100000]">
            <Link href="/docs" className="self-stretch py-5 inline-flex justify-center items-center gap-2.5 cursor-pointer group transition-all duration-200 hover:bg-[#FFFFFF]">
              <div className="justify-center text-[#FFFFFF] group-hover:text-[#0A0A0A] text-2xl font-normal font-['Atkinson_Hyperlegible'] leading-7 transition-colors duration-200">DOCUMENTATION</div>
            </Link>
            <Link href="/blog" className="self-stretch py-5 inline-flex justify-center items-center gap-2.5 cursor-pointer group transition-all duration-200 hover:bg-[#FFFFFF]">
              <div className="justify-center text-[#FFFFFF] group-hover:text-[#0A0A0A] text-2xl font-normal font-['Atkinson_Hyperlegible'] leading-7 transition-colors duration-200">BLOG</div>
            </Link>
            <Link href="/showcase" className="self-stretch py-5 inline-flex justify-center items-center gap-2.5 cursor-pointer group transition-all duration-200 hover:bg-[#FFFFFF]">
              <div className="justify-center text-[#FFFFFF] group-hover:text-[#0A0A0A] text-2xl font-normal font-['Atkinson_Hyperlegible'] leading-7 transition-colors duration-200">SHOWCASE</div>
            </Link>
            {/* GitHub in menu - Mobile only */}
            <a href="https://github.com/nervosnetwork/fiber" target="_blank" rel="noopener noreferrer" className="md:hidden self-stretch py-5 inline-flex justify-center items-center gap-2.5 cursor-pointer group transition-all duration-200 hover:bg-[#FFFFFF]">
              <div className="inline-flex justify-center items-center gap-2">
                <div className="w-[18px] h-[18px] relative">
                  <Image src="/github.svg" alt="GitHub" width={18} height={18} className="group-hover:invert transition-all duration-200" />
                </div>
                <div className="justify-center text-[#FFFFFF] group-hover:text-[#0A0A0A] text-2xl font-normal font-['Atkinson_Hyperlegible'] leading-7 transition-colors duration-200">CONTRIBUTE ON GITHUB</div>
              </div>
            </a>
          </div>
        )}
      </div>
    </>
  );
}
