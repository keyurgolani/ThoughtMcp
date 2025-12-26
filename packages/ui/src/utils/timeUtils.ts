/**
 * Format a timestamp as relative time (e.g., "5 mins ago", "2 hours ago")
 * Requirements: 4.3
 */
export function formatRelativeTime(timestamp: string | number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();

  // Handle future dates
  if (diff < 0) {
    return "Just now";
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    return years === 1 ? "1 year ago" : `${String(years)} years ago`;
  }
  if (months > 0) {
    return months === 1 ? "1 month ago" : `${String(months)} months ago`;
  }
  if (weeks > 0) {
    return weeks === 1 ? "1 week ago" : `${String(weeks)} weeks ago`;
  }
  if (days > 0) {
    return days === 1 ? "1 day ago" : `${String(days)} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${String(hours)} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 min ago" : `${String(minutes)} mins ago`;
  }
  return "Just now";
}
