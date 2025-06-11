import { BlogPost } from "./type";
import { createHash } from "crypto";
import { calculateReadingTime } from "./util";

const DEV_LOG_CATEGORY_ID = "DIC_kwDOLfBvi84CntYR";
const DEV_LOG_REPO_OWNER = "nervosnetwork";
const DEV_LOG_REPO_NAME = "fiber";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export interface DevLogsCache {
  data: BlogPost[];
  timestamp: number;
  limit: number;
}

// Cache expiration time in milliseconds (10 minutes for production)
const CACHE_EXPIRATION = process.env.NODE_ENV === 'production' ? 10 * 60 * 1000 : 5 * 60 * 1000;

// Use a more persistent cache strategy for production
let devLogsCache: DevLogsCache | null = null;

// Add graceful degradation for production
const FALLBACK_DEVLOGS: BlogPost[] = [];

export const getFiberDevLogLists = async (limit: number = 10): Promise<BlogPost[]> => {
  const now = Date.now();
  
  // Check cache first
  if (
    devLogsCache &&
    devLogsCache.limit === limit &&
    now - devLogsCache.timestamp < CACHE_EXPIRATION
  ) {
    console.log("Using cached dev logs");
    return devLogsCache.data;
  }

  // Graceful degradation if no GitHub token
  if (!GITHUB_TOKEN) {
    console.warn(
      "GitHub token is not available. Falling back to empty devlogs list. Please set the GITHUB_TOKEN environment variable for production."
    );
    return FALLBACK_DEVLOGS;
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
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL Error: ${data.errors[0].message}`);
    }

    const discussions = data.data.repository.discussions.edges;
    const formattedData: BlogPost[] = discussions.map((edge: any) => {
      const node = edge.node;
      const hashedId = createHash("sha256")
        .update(node.url)
        .digest("hex")
        .substring(0, 16);
      const rawText = node.body
        .replaceAll("#", "")
        .replaceAll("*", "")
        .replaceAll("**", "")
        .replaceAll("*", "");
      const excerpt =
        rawText.substring(0, 100) + (rawText.length > 100 ? "..." : "");

      const blogPost: BlogPost = {
        id: hashedId,
        title: node.title,
        url: node.url,
        author: node.author?.login || "Unknown",
        authorUrl: node.author?.login
          ? `https://github.com/${node.author.login}`
          : undefined,
        date: new Date(node.createdAt).toLocaleDateString(),
        excerpt,
        readTime: calculateReadingTime(node.body),
        tags: ["devlog"],
        type: "devlog",
        rawMarkdown: node.body, // Store the full raw markdown content
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
    console.error("Error fetching CKB dev logs:", error);
    
    // Graceful degradation: return cached data if available, otherwise empty array
    if (devLogsCache && devLogsCache.data.length > 0) {
      console.warn("Using stale cached data due to API error");
      return devLogsCache.data;
    }
    
    console.warn("Falling back to empty devlogs list due to API error");
    return FALLBACK_DEVLOGS;
  }
};

export const getFiberDevLogById = async (id: string): Promise<BlogPost | undefined> => {
  try {
    const devLogs = await getFiberDevLogLists();
    return devLogs.find((devLog) => devLog.id === id);
  } catch (error) {
    console.error("Error fetching devlog by ID:", error);
    return undefined;
  }
};
