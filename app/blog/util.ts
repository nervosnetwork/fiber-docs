import { BlogPost } from "./type";

const DEV_LOG_CATEGORY_ID = "DIC_kwDOLfBvi84CntYR";
const DEV_LOG_REPO_OWNER = "nervosnetwork";
const DEV_LOG_REPO_NAME = "fiber";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export interface DevLogsCache {
  data: BlogPost[];
  timestamp: number;
  limit: number;
}

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;
let devLogsCache: DevLogsCache | null = null;

export const getFiberDevLogLists = async (limit: number = 10) => {
  const now = Date.now();
  if (
    devLogsCache &&
    devLogsCache.limit === limit &&
    now - devLogsCache.timestamp < CACHE_EXPIRATION
  ) {
    console.log("Using cached dev logs");
    return devLogsCache.data;
  }

  if (!GITHUB_TOKEN) {
    console.error(
      "GitHub token is not available. Please set the GITHUB_TOKEN environment variable."
    );
    throw new Error(
      "GitHub token is not available. Please set the GITHUB_TOKEN environment variable."
    );
  }

  try {
    const query = `
	    query {
	      repository(owner: "${DEV_LOG_REPO_OWNER}", name: "${DEV_LOG_REPO_NAME}") {
		discussions(first: ${limit}, categoryId: "${DEV_LOG_CATEGORY_ID}", orderBy: {field: CREATED_AT, direction: DESC}) {
		  edges {
		    node {
		      title
		      url
		      createdAt
		      author {
			login
		      }
		      body
		    }
		  }
		}
	      }
	    }
	  `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GITHUB_TOKEN}`, // Replace with your GitHub token or provide via env
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL Error: ${data.errors[0].message}`);
    }

    const discussions = data.data.repository.discussions.edges;
    const formattedData: BlogPost[] = discussions.map((edge: any) => {
      const node = edge.node;
      const blogPost: BlogPost = {
        title: node.title,
        url: node.url,
        author: node.author?.login || "Unknown",
        date: new Date(node.createdAt).toLocaleDateString(),
        excerpt:
          node.body.substring(0, 150) + (node.body.length > 150 ? "..." : ""),
        readTime: calculateReadingTime(node.body),
        tags: ["devlog"],
        type: "devlog",
        id: node.url,
      };
      return blogPost;
    });

    // Update cache
    devLogsCache = {
      data: formattedData,
      timestamp: now,
      limit,
    };

    return formattedData;
  } catch (error) {
    throw new Error("Error fetching CKB dev logs: " + error);
  }
};

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Function to calculate reading time from content
export function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;

  // Handle empty content
  if (!content || content.trim().length === 0) {
    return "< 1 min read";
  }

  // Split by whitespace and filter out empty strings
  const words = content.split(/\s+/).filter((word) => word.length > 0).length;
  const minutes = Math.ceil(words / wordsPerMinute);

  // Handle very short content
  if (minutes < 1) {
    return "< 1 min read";
  }

  return `${minutes} min read`;
}
