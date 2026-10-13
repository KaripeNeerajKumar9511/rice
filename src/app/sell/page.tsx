'use client';

import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {useLanguage} from '@/lib/i18n';

export default function SellPage() {
  const {t} = useLanguage();

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-heading">
          <span className="section-kicker">{t('sell')}</span>
          <h1>{t('sellCta')}</h1>
          <p>{t('sellCtaBody')}</p>
        </div>
        <Link className="btn btn-primary" href="/register">
          {t('createAccount')} <ArrowRight size={16}/>
        </Link>
      </div>
    </div>
  );
}
