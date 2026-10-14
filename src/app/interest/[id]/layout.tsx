import type {Metadata} from 'next';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  return {
    title: 'Buyer enquiry',
    robots: {index: false, follow: false},
    alternates: {canonical: `/interest/${encodeURIComponent(id)}`}
  };
}

export default function InterestLayout({children}: {children: React.ReactNode}) {
  return children;
}
