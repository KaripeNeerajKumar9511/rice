import type {Metadata} from 'next';
import {getPublicListingSeo} from '@/lib/seo';
import {getSiteUrl} from '@/lib/site-url';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const listing = await getPublicListingSeo(id);
  const title = listing?.title || 'Rice listing';
  const description = listing?.description?.trim().slice(0, 300)
    || `See ${title} from a local farmer or rice retailer on RICE Dhanyam.`;

  return {
    title,
    description,
    alternates: {canonical: `/rice/${encodeURIComponent(id)}`},
    robots: listing ? {index: true, follow: true} : {index: false, follow: false},
    openGraph: {
      title,
      description,
      url: new URL(`/rice/${encodeURIComponent(id)}`, getSiteUrl()).toString(),
      type: 'article'
    }
  };
}

export default function RiceListingLayout({children}: {children: React.ReactNode}) {
  return children;
}
