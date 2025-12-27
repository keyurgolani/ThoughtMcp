/**
 * Format Utilities
 *
 * Shared formatting functions used across the UI.
 * Centralizes common formatting logic to avoid duplication.
 */

/**
 * Format a number as a percentage string
 * @param value - Number between 0 and 1
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Format a number with specified decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes
 * @returns Formatted size string (e.g., "1.5 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i];
  if (size === undefined) return `${String(bytes)} B`;
  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(2)))} ${size}`;
}

/**
 * Format duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1.5s", "150ms")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return Math.round(ms).toString() + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  return (ms / 60000).toFixed(1) + "m";
}

/**
 * Truncate text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter of a string
 * @param text - Text to capitalize
 * @returns Text with first letter capitalized
 */
export function capitalizeFirst(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
