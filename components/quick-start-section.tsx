import Link from 'next/link';

interface QuickStartCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  items: { label: string; href: string }[];
}

function QuickStartCard({ icon, title, description, href, items }: QuickStartCardProps) {
  return (
    <Link
      href={href}
      className="group block border border-invisible bg-layer-02 hover:bg-layer-03 hover-border-bright transition-all duration-200 p-lg flex flex-col gap-md"
    >
      <div className="flex items-center gap-sm">
        <div className="text-secondary group-hover:text-primary transition-colors duration-200">
          {icon}
        </div>
        <h3 className="text-h4 text-primary">{title}</h3>
      </div>
      <p className="text-body2 text-tertiary">{description}</p>
      <ul className="flex flex-col gap-xs mt-auto">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-body3 text-secondary hover:text-primary transition-colors duration-200 flex items-center gap-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-tertiary group-hover/link:text-secondary transition-colors">→</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </Link>
  );
}

export default function QuickStartSection() {
  return (
    <section className="self-stretch flex flex-col justify-start items-start mb-xxl">
      <h2 className="self-stretch text-primary text-h1 mb-xl">
        <span className="text-tertiary">Get Started</span> by Role
      </h2>
      <div className="self-stretch grid grid-cols-1 md:grid-cols-3 gap-md">
        <QuickStartCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          }
          title="Run a Node"
          description="Deploy, configure, and operate a Fiber node on mainnet or testnet."
          href="/docs/quick-start/run-a-node"
          items={[
            { label: 'Run a Node', href: '/docs/quick-start/run-a-node' },
            { label: 'Backup & Restore', href: '/docs/guide/node-operator/backup' },
            { label: 'Troubleshooting', href: '/docs/guide/node-operator/troubleshooting' },
          ]}
        />
        <QuickStartCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          }
          title="Build on Fiber"
          description="Integrate Fiber payments into your application using HTTP RPC or fiber-js."
          href="/docs/guide/developer/http-rpc-guide"
          items={[
            { label: 'HTTP RPC Guide', href: '/docs/guide/developer/http-rpc-guide' },
            { label: 'fiber-js (WASM Node)', href: '/docs/guide/developer/fiber-js' },
            { label: 'Toolchain Overview', href: '/docs/guide/developer/toolchain' },
          ]}
        />
        <QuickStartCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }
          title="Understand the Protocol"
          description="Deep-dive into Fiber's architecture, protocol specs, and cryptographic design."
          href="/docs/tech-explanation/light-paper"
          items={[
            { label: 'Light Paper', href: '/docs/tech-explanation/light-paper' },
            { label: 'Architecture & Modules', href: '/docs/tech-explanation/high-level' },
            { label: 'Core Concepts', href: '/docs/guide/core-concepts/glossary' },
          ]}
        />
      </div>
    </section>
  );
}
