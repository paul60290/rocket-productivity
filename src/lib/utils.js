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

export const generateUniqueId = () => {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to timestamp + random string
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
};

// --- Tag helpers -------------------------------------------------------------
// Turn freeform input like "Client: Acme Co" or "#Client: Acme Co"
// into a storage-safe slug like "client:acme-co"
export const toTagSlug = (raw) => {
  if (!raw) return '';
  const stripHash = (s) => s.replace(/^#/, '').trim();
  const sanitize = (s) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}:]+/gu, '-')    // keep letters/numbers/colon; others -> hyphen
      .replace(/-+/g, '-')                  // collapse repeats
      .replace(/(^-|-$)/g, '');             // trim hyphens

  const s = stripHash(raw);
  const [rawType, ...rest] = s.split(':');
  const type = sanitize((rawType || 'tag').trim());
  const value = sanitize(rest.join(':').trim());

  return value ? `${type}:${value}` : type;
};

// Turn a slug like "client:acme-co" into a nice label "Client: Acme Co"
export const tagLabelFromSlug = (slug) => {
  if (!slug) return '';
  const title = (s) => s.replace(/-/g, ' ').replace(/\b\p{L}/gu, (m) => m.toUpperCase());
  const [type, value] = slug.split(':');
  if (!value) return title(type);
  return `${title(type)}: ${title(value)}`;
};

// Normalize an incoming tag list (strings or {label} objects) into unique slugs
export const normalizeTags = (input) => {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  const slugs = arr
    .map((t) => (typeof t === 'string' ? t : t?.label || ''))
    .map(toTagSlug)
    .filter(Boolean);

  // de-dup while preserving order
  const seen = new Set();
  const unique = [];
  for (const s of slugs) {
    if (!seen.has(s)) {
      seen.add(s);
      unique.push(s);
    }
  }
  return unique;
};
