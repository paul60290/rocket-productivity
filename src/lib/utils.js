import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // The 'T00:00:00Z' ensures the date is parsed as UTC, preventing timezone-related shifts.
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC' // Specify UTC here as well for consistency in formatting.
  });
};