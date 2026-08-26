import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Fiber Network',
  description: 'Connect with the Fiber Network community and contributors.',
};

const communityLinks = [
  {
    title: 'Discord',
    description: 'Ask questions and chat with the Fiber community.',
    href: 'https://discord.gg/TVfWn5fHkN',
  },
  {
    title: 'GitHub',
    description: 'Report issues and contribute to Fiber development.',
    href: 'https://github.com/nervosnetwork/fiber',
  },
  {
    title: 'X / Twitter',
    description: 'Follow Fiber news, releases, and ecosystem updates.',
    href: 'https://x.com/FiberDevs',
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col justify-center px-4 py-16 md:px-10">
      <div className="max-w-2xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-fd-muted-foreground">
          Fiber Network
        </p>
        <h1 className="text-4xl font-bold text-fd-foreground md:text-6xl">
          Get in touch
        </h1>
        <p className="mt-5 text-lg leading-8 text-fd-muted-foreground">
          Choose the community channel that best fits what you want to discuss.
          Discord is the quickest place to ask for help.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {communityLinks.map((link) => (
          <a
            key={link.title}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary/60"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-fd-foreground">
                {link.title}
              </h2>
              <span
                aria-hidden="true"
                className="text-fd-muted-foreground transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </div>
            <p className="mt-3 leading-6 text-fd-muted-foreground">
              {link.description}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
