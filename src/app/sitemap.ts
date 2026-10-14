import type {MetadataRoute} from 'next';
import {getSiteUrl} from '@/lib/site-url';
import {getPublicListingSitemap} from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [homepage, sellPage] = [
    {url: siteUrl.toString(), changeFrequency: 'daily' as const, priority: 1},
    {url: new URL('/sell', siteUrl).toString(), changeFrequency: 'weekly' as const, priority: 0.7}
  ];
  const listings = await getPublicListingSitemap();
  return [
    homepage,
    sellPage,
    ...listings.map(listing => ({
      url: new URL(`/rice/${encodeURIComponent(listing.id)}`, siteUrl).toString(),
      lastModified: listing.published_at ? new Date(listing.published_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.6
    }))
  ];
}
