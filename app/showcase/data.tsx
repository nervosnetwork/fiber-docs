// Mock showcase projects data - in a real app, this would come from a database or API
export const showcaseProjects = [
  // Developer Tools
  {
    id: "fiber-sdk",
    title: "Fiber SDK",
    description:
      "JS SDK for building dApps on Fiber Network. Integrate with CCC, the CKB JS SDK",
    category: "Developer Tools",
    githubUrl: "https://github.com/ckb-devrel/ccc/pull/194",
    tags: ["SDK", "Development"],
    stars: 678,
    language: "TypeScript",
  },
  {
    id: "fiber-docker",
    title: "Fiber Docker",
    description:
      "Docker image that contains Fiber Node and ckb-cli for easy deployment.",
    githubUrl: "https://github.com/Flouse/ckb-fiber-docker",
    category: "Developer Tools",
    tags: ["Docker", "Development"],
    language: "TypeScript",
  },
  {
    id: "fiber-agent-bun-js",
    title: "Fiber Agent with Bun.js",
    description:
      "A server and CLI tool writing in typescript to manage Fiber Node.",
    githubUrl: "https://github.com/Keith-CY/fiber-agent",
    category: "Developer Tools",
    tags: ["Bun.js", "CLI", "Development"],
    language: "TypeScript",
  },

  // Demo & Examples
  {
    id: "fiber-wasm-demo",
    title: "Fiber WASM Demo",
    description:
      "A simple demo showcasing Fiber's capabilities using WebAssembly.",
    githubUrl: "https://github.com/officeyutong/fiber-wasm-demo",
    demoUrl: "https://fiber-wasm-demo.vercel.app/",
    category: "Demo & Examples",
    tags: ["WASM", "WebAssembly"],
    language: "TypeScript",
  },
  {
    id: "simple-game",
    title: "Micro-payment Game",
    description:
      "Retro phaser.js game with micro-payments for continues and high score rewards. Built with Phaser.js and real-time token transfers.",
    category: "Demo & Examples",
    githubUrl:
      "https://github.com/nervosnetwork/fiber-docs/tree/main/examples/simple-game",
    tags: ["Phaser.js", "Micro-payments"],
    language: "TypeScript",
  },
  {
    id: "python-testnet-demo",
    title: "Python Testnet Demo",
    description: "A Step-by-step Testnet tutorial written in Python.",
    githubUrl: "https://github.com/gpBlockchain/ckb-fiber-testnet-demo",
    category: "Demo & Examples",
    tags: ["Python", "Testnet"],
    language: "Python",
  },

  // Testing & Monitoring
  {
    id: "python-integration-tests",
    title: "Python Integration Tests",
    description: "Comprehensive test cases written in Python for Fiber Network",
    githubUrl:
      "https://github.com/cryptape/ckb-py-integration-test/tree/fiber/test_cases/fiber/devnet",
    category: "Testing & Monitoring",
    tags: ["Python", "Testing"],
    language: "Python",
  },
  {
    id: "e2e-tests-with-bruno",
    title: "E2E Tests with Bruno",
    description: "End-to-end test examples inside the Fiber repository.",
    githubUrl:
      "https://github.com/nervosnetwork/fiber/tree/develop/tests/bruno/e2e",
    category: "Testing & Monitoring",
    tags: ["Testing"],
    language: "Bruno",
  },
  {
    id: "performance-testing",
    title: "Performance Testing",
    description: "JMeter samples for Fiber performance testing",
    githubUrl: "https://github.com/gpBlockchain/fiber-jmeter-sample.git",
    category: "Testing & Monitoring",
    tags: ["Testing"],
    language: "Java",
  },
  {
    id: "stability-testing",
    title: "Stability Testing",
    description: "Scripts for testing Fiber Network stability",
    githubUrl: "https://github.com/sunchengzhu/fiber-stability-test-nodes",
    category: "Testing & Monitoring",
    tags: ["Testing"],
    language: "Python",
  },

  // Network & Resources
  {
    id: "fiber-simulator",
    title: "Fiber Simulator",
    description: "Simulate Fiber Network for educational purposes",
    githubUrl:
      "https://github.com/chenyukang/fiber-world/blob/main/simulate.html",
    demoUrl: "https://fiber-world.vercel.app/simulate.html",
    category: "Network & Resources",
    tags: ["Simulation", "Network"],
    language: "HTML",
  },
  {
    id: "testnet-visualization",
    title: "Testnet Visualization",
    description: "Visual representation of the Testnet",
    githubUrl:
      "https://github.com/gpBlockchain/CkbLightningNetworkVisualization",
    demoUrl: "http://16.162.99.28:8120/view.html",
    category: "Network & Resources",
    tags: ["Visualization", "Network"],
    language: "HTML",
  },
  {
    id: "testnet-explorer",
    title: "Testnet Explorer",
    description: "Browse the Fiber Testnet",
    githubUrl: "https://github.com/nervosnetwork/ckb-explorer",
    demoUrl: "https://testnet.explorer.nervos.org/fiber/graph/nodes",
    category: "Network & Resources",
    tags: ["Explorer", "Network"],
    language: "TypeScript",
  },
];

export const categories = [
  "All",
  "Demo & Examples",
  "Testing & Monitoring",
  "Developer Tools",
  "Network & Resources",
];
