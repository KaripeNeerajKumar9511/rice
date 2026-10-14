'use client';

import {useCallback, useEffect, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {AlertTriangle, Eye, EyeOff, Flag, Package, ShieldCheck, Store, Users} from 'lucide-react';
import {useLanguage} from '@/lib/i18n';
import {getSupabase} from '@/lib/supabase';

const PAGE_SIZE = 500;

type Seller = {
  id: string;
  role: 'farmer' | 'retailer' | 'admin';
  full_name: string;
  email: string | null;
  phone: string | null;
  account_status: string;
  created_at: string;
};

type SellerLocation = {
  seller_id: string;
  state_code: string;
  district: string;
  mandal: string | null;
  village: string | null;
};

type Listing = {
  id: string;
  seller_id: string;
  title: string;
  title_te: string | null;
  description: string | null;
  rice_type: string;
  price_amount: number;
  price_unit: string;
  stock_quantity: number;
  stock_unit: string;
  status: string;
  created_at: string;
};

type Enquiry = {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_location: string;
  buyer_address: string | null;
  requested_quantity: string | null;
  buyer_message: string | null;
  status: string;
  created_at: string;
  listing_title_snapshot: string;
};

type Report = {
  id: string;
  listing_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  listing_title: string | null;
};

type DailyAnalytics = {
  visit_date: string;
  unique_visitors: number;
  page_views: number;
};

async function readAll<T>(
  getPage: (from: number, to: number) => PromiseLike<{data: T[] | null; error: {message: string} | null}>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await getPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export default function AdminPage() {
  const {t, locale} = useLanguage();
  const sb = getSupabase();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [locations, setLocations] = useState<SellerLocation[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'sellers' | 'listings' | 'enquiries' | 'reports' | 'analytics'>('sellers');
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [denied, setDenied] = useState(false);
  const [notAuthenticated, setNotAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [busy, setBusy] = useState('');
  const [removing, setRemoving] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!sb) {
      setError(t('configureBody'));
      setNotConfigured(true);
      setLoading(false);
      return;
    }

    try {
      const {data: {user}, error: authError} = await sb.auth.getUser();
      if (authError?.name === 'AuthSessionMissingError') {
        setNotAuthenticated(true);
        setError('');
        return;
      }
      if (authError) throw authError;
      if (!user) {
        setNotAuthenticated(true);
        setLoading(false);
        return;
      }

      const {data: profile, error: profileError} = await sb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin') {
        setDenied(true);
        setNotAuthenticated(false);
        setLoading(false);
        return;
      }

      setNotAuthenticated(false);
      const [sellerRows, locationRows, listingRows, enquiryRows, reportRows] = await Promise.all([
        readAll<Seller>((from, to) => sb.from('profiles')
          .select('id,role,full_name,email,phone,account_status,created_at')
          .in('role', ['farmer', 'retailer'])
          .order('created_at', {ascending: false})
          .range(from, to)),
        readAll<SellerLocation>((from, to) => sb.from('seller_locations')
          .select('seller_id,state_code,district,mandal,village')
          .order('created_at', {ascending: false})
          .range(from, to)),
        readAll<Listing>((from, to) => sb.from('rice_listings')
          .select('id,seller_id,title,title_te,description,rice_type,price_amount,price_unit,stock_quantity,stock_unit,status,created_at')
          .order('created_at', {ascending: false})
          .range(from, to)),
        readAll<Enquiry>((from, to) => sb.from('seller_enquiries_view')
          .select('id,listing_id,seller_id,buyer_name,buyer_phone,buyer_location,buyer_address,requested_quantity,buyer_message,status,created_at,listing_title_snapshot')
          .order('created_at', {ascending: false})
          .range(from, to)),
        readAll<Report>((from, to) => sb.from('admin_reports_view')
          .select('id,listing_id,reason,details,status,created_at,listing_title')
          .order('created_at', {ascending: false})
          .range(from, to))
      ]);

      setSellers(sellerRows);
      setLocations(locationRows);
      setListings(listingRows);
      setEnquiries(enquiryRows);
      setReports(reportRows);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('authError'));
    } finally {
      setLoading(false);
    }
  }, [sb, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadAnalytics = useCallback(async () => {
    if (!sb) return;
    setAnalyticsLoading(true);
    setAnalyticsError('');
    const {data, error: queryError} = await sb.rpc('admin_get_visitor_analytics', {p_days: analyticsDays});
    if (queryError) {
      setAnalyticsError(queryError.message);
    } else {
      setAnalytics(data ?? []);
    }
    setAnalyticsLoading(false);
  }, [analyticsDays, sb]);

  useEffect(() => {
    if (tab === 'analytics' && !loading && !denied && !notAuthenticated && !notConfigured) {
      void loadAnalytics();
    }
  }, [tab, loading, denied, notAuthenticated, notConfigured, loadAnalytics]);

  async function adminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sb) return;
    setLoginBusy(true);
    setError('');
    const {data, error: loginError} = await sb.auth.signInWithPassword({
      email: 'dhanyam.admin@gmail.com',
      password: adminPassword
    });
    if (loginError || !data.user) {
      setError(t('authError'));
      setLoginBusy(false);
      return;
    }
    const {data: profile, error: profileError} = await sb.from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError || profile?.role !== 'admin') {
      await sb.auth.signOut();
      setError(t('accessDenied'));
      setLoginBusy(false);
      return;
    }
    setAdminPassword('');
    setNotAuthenticated(false);
    await load();
    setLoginBusy(false);
  }

  async function archiveListing(event: FormEvent<HTMLFormElement>, listing: Listing) {
    event.preventDefault();
    if (!sb) return;
    setBusy(listing.id);
    setError('');
    const {error: actionError} = await sb.rpc('admin_archive_listing', {
      p_listing_id: listing.id,
      p_note: note.trim()
    });
    if (actionError) {
      setError(actionError.message);
    } else {
      setRemoving('');
      setNote('');
      await load();
    }
    setBusy('');
  }

  async function actOnReport(report: Report, action: 'hide' | 'restore' | 'dismiss') {
    if (!sb) return;
    setBusy(report.id);
    setError('');
    if (action !== 'dismiss') {
      const {error: listingError} = await sb.from('rice_listings')
        .update({status: action === 'hide' ? 'hidden' : 'active'})
        .eq('id', report.listing_id);
      if (listingError) {
        setError(listingError.message);
        setBusy('');
        return;
      }
    }
    const {error: reportError} = await sb.from('reports')
      .update({
        status: action === 'dismiss' ? 'dismissed' : 'reviewed',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', report.id);
    if (reportError) {
      setError(reportError.message);
    } else {
      setReports(current => current.filter(item => item.id !== report.id));
    }
    setBusy('');
  }

  const locationBySeller = new Map(locations.map(location => [location.seller_id, location]));
  const sellerById = new Map(sellers.map(seller => [seller.id, seller]));
  const receivedBySeller = new Map<string, number>();
  for (const enquiry of enquiries) {
    receivedBySeller.set(enquiry.seller_id, (receivedBySeller.get(enquiry.seller_id) ?? 0) + 1);
  }

  if (loading) {
    return <div className="page-wrap"><div className="container"><div className="loader"/></div></div>;
  }

  if (denied) {
    return <div className="page-wrap"><div className="container error-page">
      <h1>{t('accessDenied')}</h1>
      <p>{t('adminSetup')}</p>
      <Link href="/" className="btn btn-primary">{t('backHome')}</Link>
    </div></div>;
  }

  if (notConfigured) {
    return <div className="page-wrap"><div className="container error-page">
      <h1>{t('configureBody')}</h1>
      <p>{error}</p>
    </div></div>;
  }

  if (notAuthenticated) {
    return <div className="page-wrap"><div className="container">
      <div className="auth-shell">
        <div className="auth-mark"><ShieldCheck size={27}/></div>
        <div className="form-card">
          <span className="section-kicker">RICE · ADMIN</span>
          <h1>{t('loginTitle')}</h1>
          <p>Sign in with the administrator account to continue.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <form onSubmit={event => void adminLogin(event)}>
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" value="dhanyam.admin@gmail.com" readOnly autoComplete="username"/>
            </div>
            <div className="field">
              <label htmlFor="admin-password">{t('password')}</label>
              <input id="admin-password" type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} required autoComplete="current-password"/>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loginBusy}>{loginBusy ? t('loading') : t('login')}</button>
          </form>
        </div>
      </div>
    </div></div>;
  }

  return <div className="page-wrap"><div className="container">
    <div className="dashboard-top">
      <div>
        <span className="section-kicker">RICE · ADMIN</span>
        <h1>{t('adminTitle')}</h1>
        <p>Manage registered sellers, listings, buyer requests, and reports.</p>
      </div>
      <span className="status-label"><ShieldCheck size={15}/>{t('admin')}</span>
    </div>

    {error && <div className="notice" role="alert" style={{marginBottom: 16}}>
      <AlertTriangle size={16}/><span>{error}</span>
    </div>}

    <div className="stats-grid">
      <div className="stat-card"><span>Sellers</span><strong>{sellers.length}</strong></div>
      <div className="stat-card"><span>Listings</span><strong>{listings.length}</strong></div>
      <div className="stat-card"><span>Buyer requests</span><strong>{enquiries.length}</strong></div>
      <div className="stat-card"><span>Open reports</span><strong>{reports.length}</strong></div>
    </div>

    <div className="dashboard-tabs" role="tablist" aria-label="Admin sections">
      <button className={`dashboard-tab ${tab === 'sellers' ? 'active' : ''}`} role="tab" aria-selected={tab === 'sellers'} onClick={() => setTab('sellers')}><Users size={15}/>Sellers</button>
      <button className={`dashboard-tab ${tab === 'listings' ? 'active' : ''}`} role="tab" aria-selected={tab === 'listings'} onClick={() => setTab('listings')}><Package size={15}/>Listings</button>
      <button className={`dashboard-tab ${tab === 'enquiries' ? 'active' : ''}`} role="tab" aria-selected={tab === 'enquiries'} onClick={() => setTab('enquiries')}>Buyer requests</button>
      <button className={`dashboard-tab ${tab === 'reports' ? 'active' : ''}`} role="tab" aria-selected={tab === 'reports'} onClick={() => setTab('reports')}><Flag size={15}/>{t('reports')}</button>
      <button className={`dashboard-tab ${tab === 'analytics' ? 'active' : ''}`} role="tab" aria-selected={tab === 'analytics'} onClick={() => setTab('analytics')}>Site analytics</button>
    </div>

    {tab === 'sellers' && (sellers.length ? <div className="dashboard-list">
      {sellers.map(seller => {
        const location = locationBySeller.get(seller.id);
        const sellerListings = listings.filter(listing => listing.seller_id === seller.id);
        return <article className="admin-report" key={seller.id}>
          <div className="enquiry-head">
            <div>
              <span className="status-label"><Store size={12}/>{seller.role === 'farmer' ? t('farmer') : t('retailer')}</span>
              <h3 style={{marginTop: 10}}>{seller.full_name || '—'}</h3>
              <p>Joined {new Date(seller.created_at).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN')}</p>
            </div>
            <span className="status-label">{seller.account_status}</span>
          </div>
          <div className="enquiry-facts">
            <div className="enquiry-fact"><span>Email</span><strong>{seller.email || '—'}</strong></div>
            <div className="enquiry-fact"><span>{t('mobile')}</span><strong>{seller.phone || '—'}</strong></div>
            <div className="enquiry-fact"><span>{t('location')}</span><strong>{location ? [location.village, location.mandal, location.district, location.state_code].filter(Boolean).join(', ') : '—'}</strong></div>
            <div className="enquiry-fact"><span>Listings · received requests</span><strong>{sellerListings.length} · {receivedBySeller.get(seller.id) ?? 0}</strong></div>
          </div>
          {sellerListings.length > 0 && <details>
            <summary>View this seller’s listings</summary>
            <ul>{sellerListings.map(listing => <li key={listing.id}>{listing.title} · {listing.status}</li>)}</ul>
          </details>}
        </article>;
      })}
    </div> : <div className="empty-state"><h3>No registered sellers yet.</h3></div>)}

    {tab === 'listings' && (listings.length ? <div className="dashboard-list">
      {listings.map(listing => {
        const seller = sellerById.get(listing.seller_id);
        const location = locationBySeller.get(listing.seller_id);
        return <article className="admin-report" key={listing.id}>
          <div className="enquiry-head">
            <div>
              <span className={`status-label ${listing.status === 'active' ? '' : 'pending'}`}>{listing.status}</span>
              <h3 style={{marginTop: 10}}>{listing.title}</h3>
              {listing.title_te && <p>{listing.title_te}</p>}
            </div>
            <div className="admin-action">
              {listing.status !== 'archived' && <button className="btn btn-danger btn-sm" disabled={busy === listing.id} onClick={() => {setRemoving(removing === listing.id ? '' : listing.id);setNote('');}}>
                <Package size={14}/>Remove listing
              </button>}
            </div>
          </div>
          <div className="enquiry-facts">
            <div className="enquiry-fact"><span>Seller</span><strong>{seller?.full_name || '—'} · {seller?.role || '—'}</strong></div>
            <div className="enquiry-fact"><span>Seller contact</span><strong>{seller?.phone || seller?.email || '—'}</strong></div>
            <div className="enquiry-fact"><span>{t('location')}</span><strong>{location ? [location.village, location.mandal, location.district].filter(Boolean).join(', ') : '—'}</strong></div>
            <div className="enquiry-fact"><span>Price · available stock</span><strong>₹{Number(listing.price_amount).toLocaleString('en-IN')} / {listing.price_unit} · {listing.stock_quantity} {listing.stock_unit}</strong></div>
          </div>
          {listing.description && <p>{listing.description}</p>}
          <p className="helper-text">{listing.rice_type} · Added {new Date(listing.created_at).toLocaleString(locale === 'te' ? 'te-IN' : 'en-IN')}</p>
          {removing === listing.id && <form onSubmit={event => void archiveListing(event, listing)}>
            <div className="field">
              <label htmlFor={`admin-note-${listing.id}`}>Note to seller (required)</label>
              <textarea id={`admin-note-${listing.id}`} value={note} onChange={event => setNote(event.target.value)} minLength={3} maxLength={1000} required rows={3} placeholder="Explain why this listing is being removed."/>
              <small>The listing will be archived, not permanently erased, so buyer requests and audit history are preserved. The seller will see this note in their dashboard.</small>
            </div>
            <div className="admin-action">
              <button className="btn btn-danger btn-sm" type="submit" disabled={busy === listing.id || note.trim().length < 3}>{busy === listing.id ? t('loading') : 'Remove and notify seller'}</button>
              <button className="btn btn-secondary btn-sm" type="button" disabled={busy === listing.id} onClick={() => {setRemoving('');setNote('');}}>{t('cancel')}</button>
            </div>
          </form>}
        </article>;
      })}
    </div> : <div className="empty-state"><h3>No listings yet.</h3></div>)}

    {tab === 'enquiries' && (enquiries.length ? <div className="dashboard-list">
      {enquiries.map(enquiry => {
        const seller = sellerById.get(enquiry.seller_id);
        return <article className="admin-report" key={enquiry.id}>
          <div className="enquiry-head">
            <div><h3>{enquiry.buyer_name}</h3><p>{enquiry.listing_title_snapshot} · {new Date(enquiry.created_at).toLocaleString(locale === 'te' ? 'te-IN' : 'en-IN')}</p></div>
            <span className={`status-label ${enquiry.status === 'new' ? 'pending' : ''}`}>{enquiry.status}</span>
          </div>
          <div className="enquiry-facts">
            <div className="enquiry-fact"><span>{t('mobile')}</span><strong>{enquiry.buyer_phone}</strong></div>
            <div className="enquiry-fact"><span>Buyer location</span><strong>{enquiry.buyer_location}</strong></div>
            <div className="enquiry-fact"><span>{t('quantity')}</span><strong>{enquiry.requested_quantity || '—'}</strong></div>
            <div className="enquiry-fact"><span>{t('address')}</span><strong>{enquiry.buyer_address || '—'}</strong></div>
          </div>
          {enquiry.buyer_message && <p><strong>Buyer message:</strong> {enquiry.buyer_message}</p>}
          <p className="helper-text">Seller: {seller?.full_name || '—'} · {seller?.phone || seller?.email || '—'}</p>
        </article>;
      })}
    </div> : <div className="empty-state"><h3>No buyer requests yet.</h3></div>)}

    {tab === 'reports' && (reports.length ? <div className="dashboard-list">
      {reports.map(report => <article className="admin-report" key={report.id}>
        <div>
          <span className="status-label pending"><Flag size={12}/>{report.reason}</span>
          <h3>{report.listing_title || report.listing_id}</h3>
          <p>{report.details || '—'}</p>
          <p className="helper-text">{new Date(report.created_at).toLocaleString(locale === 'te' ? 'te-IN' : 'en-IN')}</p>
        </div>
        <div className="admin-action">
          <button className="btn btn-danger btn-sm" disabled={busy === report.id} onClick={() => void actOnReport(report, 'hide')}><EyeOff size={14}/>{t('hideListing')}</button>
          <button className="btn btn-secondary btn-sm" disabled={busy === report.id} onClick={() => void actOnReport(report, 'restore')}><Eye size={14}/>{t('restoreListing')}</button>
          <button className="btn btn-secondary btn-sm" disabled={busy === report.id} onClick={() => void actOnReport(report, 'dismiss')}>{t('cancel')}</button>
        </div>
      </article>)}
    </div> : <div className="empty-state"><div className="empty-icon"><ShieldCheck size={22}/></div><h3>{t('noReports')}</h3><p>{t('adminBody')}</p></div>)}

    {tab === 'analytics' && <section aria-label="Site visitor analytics" style={{paddingTop: 20}}>
      <div className="enquiry-head" style={{marginBottom: 16}}>
        <div><h2>Site visitors</h2><p>Approximate unique browsers and page views, grouped by UTC day.</p></div>
        <label className="field" htmlFor="analytics-days" style={{minWidth: 160}}>
          <span>Date range</span>
          <select id="analytics-days" value={analyticsDays} onChange={event => setAnalyticsDays(Number(event.target.value))}>
            <option value={1}>Today</option>
            <option value={2}>Last 2 days</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>
      {analyticsError && <div className="notice" role="alert"><AlertTriangle size={16}/><span>{analyticsError}</span></div>}
      {analyticsLoading ? <div className="loader"/> : <>
        <div className="stats-grid">
          <div className="stat-card"><span>Unique visitors · selected range</span><strong>{analytics.reduce((sum, day) => sum + day.unique_visitors, 0)}</strong></div>
          <div className="stat-card"><span>Page views · selected range</span><strong>{analytics.reduce((sum, day) => sum + day.page_views, 0)}</strong></div>
        </div>
        <div className="dashboard-list" style={{marginTop: 16}}>
          {analytics.map(day => {
            const maxVisitors = Math.max(1, ...analytics.map(item => item.unique_visitors));
            const barWidth = Math.max(2, day.unique_visitors / maxVisitors * 100);
            return <article className="admin-report" key={day.visit_date}>
              <div className="enquiry-head">
                <strong>{new Date(`${day.visit_date}T00:00:00Z`).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {dateStyle: 'medium', timeZone: 'UTC'})}</strong>
                <span className="helper-text">{day.unique_visitors} visitors · {day.page_views} page views</span>
              </div>
              <div aria-label={`${day.unique_visitors} unique visitors`} style={{height: 8, background: '#e8ede5', borderRadius: 8, marginTop: 12}}>
                <div style={{height: '100%', width: `${barWidth}%`, background: '#527b43', borderRadius: 8}}/>
              </div>
            </article>;
          })}
          {!analytics.length && !analyticsError && <div className="empty-state"><h3>No visitor activity in this date range.</h3></div>}
        </div>
      </>}
      <p className="helper-text" style={{marginTop: 16}}>Visitor counts use a signed, pseudonymous browser cookie and do not store IP addresses. They are estimates, not verified people.</p>
    </section>}
  </div></div>;
}
