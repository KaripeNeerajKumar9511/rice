'use client';

import Script from 'next/script';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';

declare global {
  interface Window {
    dataLayer: unknown[] | undefined;
    gtag: ((...args: unknown[]) => void) | undefined;
  }
}

const measurementId = 'G-5SEYWTDB8K';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const isPrivatePage = /^\/(admin|dashboard|login|register|api|interest|report)(\/|$)/.test(pathname || '');

  useEffect(() => {
    if (isPrivatePage) return;
    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId, {send_page_view: false});
  }, [isPrivatePage]);

  useEffect(() => {
    if (pathname && !isPrivatePage) {
      window.gtag?.('event', 'page_view', {
        page_path: pathname,
        page_location: window.location.href
      });
    }
  }, [pathname, isPrivatePage]);

  return isPrivatePage ? null : <Script
    src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
    strategy="afterInteractive"
  />;
}
