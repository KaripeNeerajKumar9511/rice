'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {AlertTriangle, Globe2, Languages, LayoutDashboard, LogIn, LogOut, Menu, Sprout, Store, X} from 'lucide-react';
import {LanguageProvider, useLanguage} from '@/lib/i18n';
import {getSupabase} from '@/lib/supabase';
import {SellerLocationGate} from '@/components/seller-location-gate';

type AdminNotice = {
  id: string;
  listing_title: string;
  note: string;
  created_at: string;
};

function Header() {
  const {t, locale, setLanguageOpen} = useLanguage();
  const [pathRole, setPathRole] = useState('');
  const [user, setUser] = useState(false);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(async ({data}) => {
      setUser(!!data.user);
      if (data.user) {
        const {data: profile} = await sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
        setPathRole(profile?.role || 'farmer');
      }
    });
    const {data: listener} = sb.auth.onAuthStateChange((_event, session) => setUser(!!session?.user));
    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  async function logout() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(false);
    router.push('/');
    setMenu(false);
  }

  return <header className="site-header"><div className="container nav-wrap">
    <Link href="/" className="brand"><span className="brand-mark"><Sprout size={23}/></span><span className="brand-text"><strong>RICE</strong><small>ధాన్యం · DHANYAM</small></span></Link>
    <nav className={`nav-links ${menu ? 'nav-open' : ''}`}>
      <Link href="/#market" onClick={() => setMenu(false)}>{t('explore')}</Link>
      <Link href="/sell" onClick={() => setMenu(false)}><Store size={16}/>{t('sell')}</Link>
      {user ? <Link href={pathRole === 'admin' ? '/admin' : '/dashboard'} onClick={() => setMenu(false)}><LayoutDashboard size={16}/>{pathRole === 'admin' ? t('admin') : t('dashboard')}</Link> : <Link href="/login" onClick={() => setMenu(false)}><LogIn size={16}/>{t('login')}</Link>}
      <button className="nav-language" onClick={() => {setLanguageOpen(true);setMenu(false);}}><Globe2 size={16}/>{locale === 'te' ? 'తెలుగు' : 'English'}</button>
      {user && <button className="nav-logout" onClick={logout}><LogOut size={16}/>{t('logout')}</button>}
    </nav>
    <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
  </div></header>;
}

function SellerAdminNotices() {
  const pathname = usePathname();
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) {
      setNotices([]);
      setError('');
      return;
    }

    let live = true;

    async function load() {
      const client = getSupabase();
      if (!client) return;
      const {data: {user}, error: authError} = await client.auth.getUser();
      if (authError) {
        if (live) setError(authError.message);
        return;
      }
      if (!user) return;

      const {data, error: queryError} = await client.from('admin_notifications')
        .select('id,listing_title,note,created_at')
        .eq('seller_id', user.id)
        .order('created_at', {ascending: false})
        .limit(50);
      if (!live) return;
      if (queryError) setError(queryError.message);
      else setNotices(data ?? []);
    }

    void load();
    return () => {live = false;};
  }, [pathname]);

  if (!pathname.startsWith('/dashboard') || (!notices.length && !error)) return null;

  return <section className="container" aria-label="Administrator messages" style={{paddingTop: 20}}>
    {error && <div className="notice" role="alert"><AlertTriangle size={16}/><span>{error}</span></div>}
    {notices.length > 0 && <div className="dashboard-list">
      {notices.map(notice => <article className="admin-report" key={notice.id}>
        <div className="enquiry-head">
          <div><span className="status-label pending">Administrator message</span><h3 style={{marginTop: 10}}>{notice.listing_title}</h3></div>
          <time className="helper-text" dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleString()}</time>
        </div>
        <p>{notice.note}</p>
      </article>)}
    </div>}
  </section>;
}

function Footer() {
  const {t, setLanguageOpen} = useLanguage();
  return <footer className="site-footer"><div className="container footer-inner">
    <div className="footer-brand"><span className="brand-mark"><Sprout size={22}/></span><div><strong>RICE <span>· ధాన్యం</span></strong><p>{t('footerLine')}</p></div></div>
    <div className="footer-links"><Link href="/#market">{t('explore')}</Link><Link href="/sell">{t('sell')}</Link><a href="mailto:dhanyam.app@gmail.com">Contact support: dhanyam.app@gmail.com</a><button onClick={() => setLanguageOpen(true)}><Languages size={15}/>{t('language')}</button></div>
    <p className="footer-disclaimer">{t('contactNote')} <span aria-hidden="true">·</span> Developed by <a href="https://www.linkedin.com/in/karipe-neeraj-kumar-5a04a2277/" target="_blank" rel="noopener noreferrer"><strong>Karipe Neeraj Kumar</strong></a></p>
  </div></footer>;
}

function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef('');

  useEffect(() => {
    if (!pathname || /^\/(admin|dashboard|login|register|api)(\/|$)/.test(pathname)) return;
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    void fetch('/api/analytics/visit', {credentials: 'same-origin'})
      .then(async response => {
        if (response.headers.get('X-Visitor-Analytics') === 'disabled') return null;
        if (!response.ok) throw new Error(`Visitor cookie setup failed (${response.status})`);
        return fetch('/api/analytics/visit', {
          method: 'POST',
          credentials: 'same-origin'
        });
      })
      .then(response => {
        if (!response) return;
        if (!response.ok) throw new Error(`Visitor analytics request failed (${response.status})`);
      })
      .catch(error => console.error('Could not record visitor analytics:', error));
  }, [pathname]);

  return null;
}

function LanguageModal() {
  const {languageOpen, setLanguageOpen, setLocale, t} = useLanguage();
  if (!languageOpen) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card"><div className="modal-icon"><Languages size={25}/></div><h2>{t('chooseLanguage')}</h2><p className="muted">{t('languageBody')}</p>
      <div className="language-options">
        <button className="language-option" onClick={() => setLocale('te')}><span className="language-native">తెలుగు</span><span className="muted">Telugu</span><span className="option-arrow">↗</span></button>
        <button className="language-option" onClick={() => setLocale('en')}><span className="language-native">English</span><span className="muted">English</span><span className="option-arrow">↗</span></button>
      </div>
      <button className="text-button modal-close" onClick={() => setLanguageOpen(false)}>{t('cancel')}</button>
    </div>
  </div>;
}

export function SiteShell({children}: {children: ReactNode}) {
  return <LanguageProvider><VisitorTracker/><Header/><SellerLocationGate/><SellerAdminNotices/><main>{children}</main><Footer/><LanguageModal/></LanguageProvider>;
}
