export function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
}
