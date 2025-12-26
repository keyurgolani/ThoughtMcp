/**
 * Get severity color class for bias - uses CSS classes for theme-aware colors
 * Requirements: 24.2 - Bias Card Severity Coloring
 */
export function getSeverityColorClass(severity: number): string {
  if (severity >= 0.7) return "status-badge-error border";
  if (severity >= 0.4) return "status-badge-warning border";
  return "status-badge-success border";
}
