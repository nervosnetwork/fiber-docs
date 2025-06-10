import Link from 'next/link';

// SVG Icon Components
const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const RocketLaunchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
);

const BeakerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const LinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero Section */}
      <section className="flex flex-col justify-center items-center text-center mt-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="mb-6 text-6xl font-bold">
            Hello Fiber!
          </h1>
          <p className="mb-8 text-2xl text-muted-foreground mx-auto">
            Explore go-to resource for learning and building on Fiber Network
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-4 px-6">
        <div className="mx-auto">
          <div className="grid max-w-4xl mx-auto md:grid-cols-2 gap-8">
            <Link 
              href="/docs/quick-start/run-a-node"
              className="group p-8 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="flex items-center mb-4">
                <RocketLaunchIcon className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Quick Start</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Get up and running with Fiber Network in minutes. Learn how to run a node, make transfers, and connect with other nodes.
              </p>
              <div className="flex items-center text-primary">
                <span className="font-medium">Read Docs</span>
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </div>
            </Link>
            
            <Link 
              href="/docs/tech-explanation/payment-channel"
              className="group p-8 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="flex items-center mb-4">
                <BeakerIcon className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Tech Explanation</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Dive deep into the technical details of Fiber Network, including payment channels, protocols, and architecture.
              </p>
              <div className="flex items-center text-primary">
                <span className="font-medium">Learn More</span>
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Useful Links */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Useful Links</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <a 
              href="https://github.com/nervosnetwork/fiber"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">GitHub Repository</h3>
                <p className="text-sm text-muted-foreground">Fiber Node Rust Impl</p>
              </div>
            </a>
            
            <a 
              href="https://www.fiber.world/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-4">
                <LinkIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">Official Website</h3>
                <p className="text-sm text-muted-foreground">fiber.world</p>
              </div>
            </a>
            
            <a 
              href="https://x.com/FiberDevs"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/20 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">Twitter</h3>
                <p className="text-sm text-muted-foreground">Follow for updates</p>
              </div>
            </a>
            
            <a 
              href="/blog"
              className="group flex items-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-4">
                <BookOpenIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">Blog</h3>
                <p className="text-sm text-muted-foreground">Latest insights & updates</p>
              </div>
            </a>
            
            <a 
              href="https://github.com/nervosnetwork/fiber/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">Issue Tracker</h3>
                <p className="text-sm text-muted-foreground">Report bugs & requests</p>
              </div>
            </a>
            
            <a 
              href="/showcase"
              className="group flex items-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">Showcase</h3>
                <p className="text-sm text-muted-foreground">See what's built on Fiber</p>
              </div>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
