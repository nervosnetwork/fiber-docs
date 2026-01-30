import Image from "next/image";

export default function Footer() {
  return (
    <div className="self-stretch p-xxl border-t border-invisible flex flex-col justify-center items-center gap-md">
      <div className="w-48 h-10 relative overflow-hidden">
        <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
      </div>
      <div className="text-display text-primary text-center">Join Our Community</div>
      <div className="flex justify-start items-center gap-md">
        <a 
          href="https://x.com/@FiberDevs" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-12 h-12 relative cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image src="/twitter.svg" alt="Twitter" fill className="object-contain" />
        </a>
        <a 
          href="https://github.com/nervosnetwork/fiber" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-12 h-12 relative cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image src="/github.svg" alt="GitHub" fill className="object-contain" />
        </a>
        <div className="w-12 h-12 relative">
          <Image src="/substack.svg" alt="Substack" fill className="object-contain" />
        </div>
      </div>
    </div>
  );
}
