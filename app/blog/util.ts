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
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  // Handle very short content
  if (minutes < 1) {
    return "< 1 min read";
  }
  
  return `${minutes} min read`;
}
