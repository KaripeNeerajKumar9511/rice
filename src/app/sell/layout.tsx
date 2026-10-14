import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Sell rice',
  description: 'List your rice for local buyers. Farmers and rice retailers across Telangana and Andhra Pradesh can reach nearby customers on RICE Dhanyam.',
  alternates: {canonical: '/sell'},
  openGraph: {
    title: 'Sell rice with RICE Dhanyam',
    description: 'Connect your rice harvest or stock with nearby buyers.'
  }
};

export default function SellLayout({children}: {children: React.ReactNode}) {
  return children;
}
