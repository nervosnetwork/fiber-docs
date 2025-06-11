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
    throw new Error("Error fetching CKB dev logs: " + error);
  }
};

export const getFiberDevLogById = async (id: string) => {
  const devLogs = await getFiberDevLogLists();
  return devLogs.find((devLog) => devLog.id === id);
};
