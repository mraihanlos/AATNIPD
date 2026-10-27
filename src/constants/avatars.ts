/**
 * Silhouette Avatar Constants and Sanitizer Utilities
 * Replaces external Unsplash avatars with clean, high-contrast, scalable SVG silhouettes
 */

export const OFFICIAL_SILHOUETTE_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <linearGradient id="avatar-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f2b48"/>
      <stop offset="100%" stop-color="#051626"/>
    </linearGradient>
    <linearGradient id="avatar-accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="avatar-body" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="64" cy="64" r="62" fill="url(#avatar-bg)" stroke="#0284c7" stroke-width="2.5"/>
  <!-- Ambient light glow -->
  <circle cx="64" cy="42" r="38" fill="url(#avatar-accent)" opacity="0.25"/>
  <!-- Shoulders & Torso -->
  <path d="M22 116 C22 93 39 81 54 77 C57 81 60 83 64 83 C68 83 71 81 74 77 C89 81 106 93 106 116 Z" fill="url(#avatar-body)"/>
  <!-- Neck -->
  <path d="M54 66 L54 79 C57 82 60 84 64 84 C68 84 71 82 74 79 L74 66 Z" fill="#94a3b8"/>
  <!-- Ears -->
  <circle cx="41" cy="51" r="4.5" fill="#e2e8f0"/>
  <circle cx="87" cy="51" r="4.5" fill="#e2e8f0"/>
  <!-- Head & Hair Silhouette -->
  <circle cx="64" cy="49" r="22" fill="url(#avatar-body)"/>
  <!-- Hair: clean silhouette haircut -->
  <path d="M42 46 C41 31 50 23 64 23 C78 23 87 31 86 46 C82 34 75 28 64 28 C51 28 46 34 42 46 Z" fill="#64748b"/>
  <!-- Collar accent -->
  <path d="M64 84 L59 96 L64 105 L69 96 Z" fill="#0284c7" opacity="0.85"/>
</svg>
`.trim())}`;

// One unified silhouette for all accounts
export const DEFAULT_AVATAR = OFFICIAL_SILHOUETTE_AVATAR;
export const MAN_SILHOUETTE_AVATAR = OFFICIAL_SILHOUETTE_AVATAR;
export const WOMAN_SILHOUETTE_AVATAR = OFFICIAL_SILHOUETTE_AVATAR;

/**
 * Checks if an avatar URL is an Unsplash link
 */
export function isUnsplashAvatar(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('images.unsplash.com') || url.includes('unsplash.com');
}

/**
 * Returns the one official silhouette avatar for all accounts
 */
export function getSilhouetteAvatar(_gender?: string): string {
  return OFFICIAL_SILHOUETTE_AVATAR;
}

/**
 * Sanitizes any avatar URL:
 * If it points to Unsplash, is empty, or is invalid, replaces it with the one official SVG silhouette.
 */
export function sanitizeAvatar(
  avatarUrl?: string | null,
  _genderOrRole?: string,
  _name?: string
): string {
  if (!avatarUrl || isUnsplashAvatar(avatarUrl)) {
    return OFFICIAL_SILHOUETTE_AVATAR;
  }
  return avatarUrl;
}
