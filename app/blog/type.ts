export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  author: string;
  type: "devlog" | "blog";
  url?: string; // GitHub URL for devlogs
}
