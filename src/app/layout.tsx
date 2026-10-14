import type {Metadata, Viewport} from 'next';
import './globals.css';
import {GoogleAnalytics} from '@/components/google-analytics';
import {SiteShell} from '@/components/site-shell';
import {getSiteUrl} from '@/lib/site-url';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {default: 'RICE — Dhanyam | Local Rice Marketplace', template: '%s · RICE Dhanyam'},
  description: 'Discover rice varieties from farmers and retailers across Telangana and Andhra Pradesh. Send an enquiry and get a callback from the seller.',
  applicationName: 'RICE Dhanyam',
  manifest: '/manifest.json',
  icons: {icon: '/icon.svg'},
  alternates: {canonical: '/'},
  keywords: [
    'buy rice from farmers',
    'local rice marketplace',
    'rice farmers Telangana',
    'rice sellers Andhra Pradesh',
    'ధాన్యం'
  ],
  authors: [{name: 'RICE Dhanyam'}],
  creator: 'Karipe Neeraj Kumar',
  publisher: 'RICE Dhanyam',
  robots: {
    index: true,
    follow: true,
    googleBot: {index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1}
  },
  openGraph: {
    title: 'RICE — Dhanyam',
    description: 'Good rice. Nearby growers. A simpler way to buy.',
    url: siteUrl,
    siteName: 'RICE Dhanyam',
    locale: 'en_IN',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'RICE — Dhanyam',
    description: 'Good rice. Nearby growers. A simpler way to buy.'
  }
};

export const viewport: Viewport = {
  themeColor: '#365c2d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en">
    <body>
      <GoogleAnalytics/>
      <SiteShell>{children}</SiteShell>
    </body>
  </html>;
}
