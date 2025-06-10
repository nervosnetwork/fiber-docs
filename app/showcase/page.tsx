import Link from 'next/link';

// Mock showcase projects data - in a real app, this would come from a database or API
const showcaseProjects = [
  // Gaming & Entertainment
  {
    id: 'fiber-chess',
    title: 'Fiber Chess',
    description: 'Decentralized chess platform with stake-based matches and tournament rewards. Players can wager tokens on games and participate in global tournaments.',
    category: 'Gaming & Entertainment',
    image: '/api/placeholder/400/250?text=Fiber+Chess',
    githubUrl: 'https://github.com/fiber-examples/fiber-chess',
    demoUrl: 'https://chess.fiber.network',
    tags: ['WebSocket', 'Game Theory', 'Smart Contracts'],
    stars: 234,
    language: 'TypeScript',
    status: 'Active'
  },
  {
    id: 'micro-arcade',
    title: 'Micro Arcade',
    description: 'Retro arcade games with micro-payments for continues and high score rewards. Built with Phaser.js and real-time token transfers.',
    category: 'Gaming & Entertainment',
    image: '/api/placeholder/400/250?text=Micro+Arcade',
    githubUrl: 'https://github.com/fiber-examples/micro-arcade',
    demoUrl: 'https://arcade.fiber.network',
    tags: ['Phaser.js', 'Micro-payments', 'Leaderboards'],
    stars: 189,
    language: 'JavaScript',
    status: 'Active'
  },
  
  // DeFi & Finance
  {
    id: 'fiber-dex',
    title: 'Fiber DEX',
    description: 'Decentralized exchange with automated market making and liquidity pools. Features advanced trading tools and yield farming opportunities.',
    category: 'DeFi & Finance',
    image: '/api/placeholder/400/250?text=Fiber+DEX',
    githubUrl: 'https://github.com/fiber-examples/fiber-dex',
    demoUrl: 'https://dex.fiber.network',
    tags: ['AMM', 'Liquidity Pools', 'Yield Farming'],
    stars: 456,
    language: 'Rust',
    status: 'Active'
  },
  {
    id: 'prediction-market',
    title: 'Prediction Markets',
    description: 'Create and participate in prediction markets for any event. Decentralized oracle integration and automated settlement.',
    category: 'DeFi & Finance',
    image: '/api/placeholder/400/250?text=Prediction+Markets',
    githubUrl: 'https://github.com/fiber-examples/prediction-market',
    demoUrl: 'https://predict.fiber.network',
    tags: ['Oracles', 'Markets', 'Governance'],
    stars: 298,
    language: 'Solidity',
    status: 'Beta'
  },
  
  // NFT & Digital Assets
  {
    id: 'nft-marketplace',
    title: 'Fiber NFT Marketplace',
    description: 'Full-featured NFT marketplace with minting, trading, and royalty management. Supports multiple token standards and batch operations.',
    category: 'NFT & Digital Assets',
    image: '/api/placeholder/400/250?text=NFT+Marketplace',
    githubUrl: 'https://github.com/fiber-examples/nft-marketplace',
    demoUrl: 'https://nft.fiber.network',
    tags: ['NFT', 'Marketplace', 'Royalties'],
    stars: 367,
    language: 'TypeScript',
    status: 'Active'
  },
  {
    id: 'dynamic-nft',
    title: 'Dynamic NFT Art',
    description: 'NFTs that evolve based on on-chain data and user interactions. Generative art with programmable traits and rarity mechanics.',
    category: 'NFT & Digital Assets',
    image: '/api/placeholder/400/250?text=Dynamic+NFT',
    githubUrl: 'https://github.com/fiber-examples/dynamic-nft',
    demoUrl: 'https://art.fiber.network',
    tags: ['Generative Art', 'Dynamic Metadata', 'P5.js'],
    stars: 145,
    language: 'JavaScript',
    status: 'Active'
  },
  
  // Developer Tools
  {
    id: 'fiber-sdk',
    title: 'Fiber SDK & CLI',
    description: 'Comprehensive development toolkit for building on Fiber Network. Includes CLI tools, libraries, and code generators.',
    category: 'Developer Tools',
    image: '/api/placeholder/400/250?text=Fiber+SDK',
    githubUrl: 'https://github.com/nervosnetwork/fiber-sdk',
    demoUrl: 'https://docs.fiber.network/sdk',
    tags: ['SDK', 'CLI', 'Development'],
    stars: 678,
    language: 'TypeScript',
    status: 'Active'
  },
  {
    id: 'contract-templates',
    title: 'Smart Contract Templates',
    description: 'Battle-tested smart contract templates for common use cases. Includes security best practices and comprehensive tests.',
    category: 'Developer Tools',
    image: '/api/placeholder/400/250?text=Contract+Templates',
    githubUrl: 'https://github.com/fiber-examples/contract-templates',
    demoUrl: 'https://templates.fiber.network',
    tags: ['Smart Contracts', 'Templates', 'Security'],
    stars: 423,
    language: 'Solidity',
    status: 'Active'
  },
  
  // Social & Communication
  {
    id: 'decentralized-social',
    title: 'Fiber Social',
    description: 'Decentralized social media platform with token-gated communities and creator monetization. Own your content and audience.',
    category: 'Social & Communication',
    image: '/api/placeholder/400/250?text=Fiber+Social',
    githubUrl: 'https://github.com/fiber-examples/fiber-social',
    demoUrl: 'https://social.fiber.network',
    tags: ['Social Media', 'Token Gating', 'Creator Economy'],
    stars: 512,
    language: 'React',
    status: 'Beta'
  }
];

const categories = [
  'All',
  'Gaming & Entertainment',
  'DeFi & Finance', 
  'NFT & Digital Assets',
  'Developer Tools',
  'Social & Communication'
];

function getStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Beta':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Coming Soon':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

function getLanguageColor(language: string) {
  const colors: { [key: string]: string } = {
    'TypeScript': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'JavaScript': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Rust': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Solidity': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'React': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  };
  return colors[language] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

export default function ShowcasePage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="mb-4 text-4xl font-bold">Showcase</h1>
          <p className="text-lg text-fd-muted-foreground max-w-3xl mx-auto">
            Discover amazing open source projects built on Fiber Network. From DeFi protocols to gaming platforms, 
            explore what's possible and get inspired for your next project.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="text-center p-6 border border-fd-border rounded-lg bg-fd-background/50">
            <div className="text-2xl font-bold text-fd-primary mb-1">{showcaseProjects.length}</div>
            <div className="text-sm text-fd-muted-foreground">Total Projects</div>
          </div>
          <div className="text-center p-6 border border-fd-border rounded-lg bg-fd-background/50">
            <div className="text-2xl font-bold text-fd-primary mb-1">
              {showcaseProjects.reduce((sum, project) => sum + project.stars, 0)}
            </div>
            <div className="text-sm text-fd-muted-foreground">GitHub Stars</div>
          </div>
          <div className="text-center p-6 border border-fd-border rounded-lg bg-fd-background/50">
            <div className="text-2xl font-bold text-fd-primary mb-1">{categories.length - 1}</div>
            <div className="text-sm text-fd-muted-foreground">Categories</div>
          </div>
          <div className="text-center p-6 border border-fd-border rounded-lg bg-fd-background/50">
            <div className="text-2xl font-bold text-fd-primary mb-1">
              {showcaseProjects.filter(p => p.status === 'Active').length}
            </div>
            <div className="text-sm text-fd-muted-foreground">Active Projects</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((category) => (
            <button
              key={category}
              className="px-4 py-2 text-sm font-medium rounded-full border border-fd-border hover:border-fd-primary/50 hover:bg-fd-primary/10 transition-all duration-200"
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {showcaseProjects.map((project) => (
            <div
              key={project.id}
              className="group border border-fd-border rounded-lg overflow-hidden hover:border-fd-primary/50 transition-all duration-200 hover:shadow-lg bg-fd-background"
            >
              {/* Project Image */}
              <div className="aspect-video bg-fd-muted/30 relative overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Project Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-fd-foreground group-hover:text-fd-primary transition-colors">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-fd-muted-foreground">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {project.stars}
                  </div>
                </div>

                <p className="text-sm text-fd-muted-foreground mb-4 line-clamp-3">
                  {project.description}
                </p>

                {/* Category Badge */}
                <div className="mb-4">
                  <span className="text-xs font-medium text-fd-primary bg-fd-primary/10 px-2 py-1 rounded-full">
                    {project.category}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-fd-muted text-fd-muted-foreground rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLanguageColor(project.language)}`}>
                    {project.language}
                  </span>
                  
                  <div className="flex gap-2">
                    <Link
                      href={project.githubUrl}
                      className="p-2 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </Link>
                    <Link
                      href={project.demoUrl}
                      className="p-2 text-fd-muted-foreground hover:text-fd-primary transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-fd-muted/30 rounded-lg p-12 border border-fd-border">
          <h3 className="text-2xl font-semibold mb-4">Build the Next Big Thing</h3>
          <p className="text-fd-muted-foreground mb-6 max-w-2xl mx-auto">
            Ready to create something amazing on Fiber Network? Get started with our documentation 
            and join a growing community of builders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="px-6 py-3 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Start Building
            </Link>
            <Link
              href="https://github.com/nervosnetwork/fiber"
              className="px-6 py-3 border border-fd-border rounded-lg font-medium hover:border-fd-primary/50 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contribute on GitHub
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
