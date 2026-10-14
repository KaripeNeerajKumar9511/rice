import type {Metadata} from 'next';

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  return {
    title: 'Report a listing',
    robots: {index: false, follow: false},
    alternates: {canonical: `/report/${encodeURIComponent(id)}`}
  };
}

export default function ReportLayout({children}: {children: React.ReactNode}) {
  return children;
}
