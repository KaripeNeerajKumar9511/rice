# RICE — Dhanyam (ధాన్యం)

Mobile-first Telugu/English rice marketplace for Telangana and Andhra Pradesh. Visitors browse rice listings and submit an **I'm Interested** enquiry; sellers view buyer details in their dashboard and call them back. No checkout or payment processing is included.

## Included

- Next.js App Router, TypeScript, Tailwind CSS and responsive custom UI
- First-visit Telugu/English chooser with remembered preference
- Demo homepage when Supabase is not configured (demo records are not live offers)
- Farmer/retailer registration and password login
- Rice listing create/edit/pause/unavailable workflows
- Buyer enquiry form with consent, server-side validation, listing snapshots and duplicate cooldown
- Seller enquiries dashboard, call buyer, status tracking and private notes
- Listing reports and admin hide/restore moderation
- PostgreSQL schema, RLS, RPC functions and PostGIS location column/index
- Admin-only seller/listing/enquiry/report management and daily visitor analytics
- Canonical metadata, Open Graph/Twitter previews, `robots.txt`, and a dynamic sitemap
- Vercel-compatible deployment setup

## Requirements

Node.js 20.9+ and npm, plus a Supabase project for live functionality.

## Run locally

```bash
npm install
cp .env.example .env.local
```

Set `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SUPABASE_SERVICE_ROLE_KEY
ANALYTICS_COOKIE_SECRET=REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

For `ANALYTICS_COOKIE_SECRET`, generate a fresh value with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Keep both server-only values private: never prefix them with `NEXT_PUBLIC_`, add them to client code, or commit actual values. Set `NEXT_PUBLIC_SITE_URL` to the real HTTPS production domain when deploying; it is the source for canonical links and sitemap URLs. The provided localhost URL is only for local development.

Then run `npm run dev` and open `http://localhost:3000`.

Without Supabase credentials, the public homepage displays clearly labelled illustrative demo listings. Demo enquiries are deliberately not saved.

## Configure Supabase

1. Create a new Supabase project.
2. Run the entire `supabase/schema.sql` file in Supabase SQL Editor.
3. Run the entire `supabase/admin_panel.sql` file to enable admin email visibility, seller notices, safe listing archiving, and the protected visitor-analytics storage/functions.
4. Copy Project URL and the public publishable/anon key into `.env.local`.
5. In Authentication → URL Configuration, set Site URL to `http://localhost:3000` and add your production domain to allowed redirect URLs.
6. Register a seller using `/register`. If email confirmation is enabled, confirm the email before logging in.
7. In Dashboard → Profile, choose Telangana or Andhra Pradesh and enter the district. Save it before creating a listing.
8. Add a listing, open it in the public marketplace and submit a test enquiry using a test number. Confirm it appears in the seller dashboard.
9. In Supabase Dashboard → Authentication → Users, create the administrator user with email `dhanyam.admin@gmail.com` and the password you chose for the admin account. Set or reset the password there; Auth passwords are hashed and must not be stored in application code, SQL scripts, or this repository.
10. After creating the Auth user, run this query in Supabase SQL Editor to grant administrator access:

```sql
do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where lower(email) = lower('dhanyam.admin@gmail.com');

  if admin_user_id is null then
    raise exception 'Create dhanyam.admin@gmail.com in Supabase Authentication before running this query';
  end if;

  update public.profiles
  set role = 'admin',
      email = 'dhanyam.admin@gmail.com'
  where id = admin_user_id;

  if not found then
    raise exception 'Admin profile was not found. Confirm supabase/schema.sql and supabase/admin_panel.sql have been applied.';
  end if;
end;
$$;
```

Sign in at `/admin`; the page accepts only `dhanyam.admin@gmail.com` and verifies the admin role. Set or reset its password in Supabase Auth (for example, the requested `Admin@123`); the SQL query grants the role only and does not set or reveal the password. Admin removal archives listings instead of permanently erasing them, preserving buyer requests and audit history; the accompanying note appears in the seller dashboard.
Admin access is never available through public registration. Do not put a Supabase service-role/secret key in browser code or any `NEXT_PUBLIC_*` variable.

## Analytics and search indexing

- The supplied GA4 measurement ID `G-5SEYWTDB8K` is installed for public-page views and client-side route changes. Admin, account, enquiry and report pages are excluded.
- The admin dashboard's **Site analytics** tab shows daily unique browsers and page views for 1, 2, 7, 30, or 90 days. It uses a signed, HttpOnly, same-site cookie and stores only a keyed hash plus daily totals; it does not collect IP addresses, user agents, or page paths. Counts are approximate browsers, not verified people. Records older than 400 days are pruned as new visits are recorded.
- Analytics requires the server-only `SUPABASE_SERVICE_ROLE_KEY` and `ANALYTICS_COOKIE_SECRET` environment variables in `.env.local` and the production host. The database roles/RPCs are installed by `supabase/admin_panel.sql`; no anonymous client can read analytics or invoke the recording function.
- The root metadata provides canonical, Open Graph and Twitter tags. Public listing pages get per-listing titles, descriptions and canonical URLs. Admin, account, enquiry and report pages are marked `noindex`; `robots.txt` excludes those private routes.
- `/sitemap.xml` contains the homepage, seller page, and published public listings. Submit `https://YOUR_DOMAIN/sitemap.xml` in Google Search Console after deploying with the real `NEXT_PUBLIC_SITE_URL`.
- Google Analytics uses Google's browser script and may set/receive Google analytics identifiers according to your GA4 settings. Before launch, publish a privacy notice and configure consent/retention settings appropriate to your jurisdiction.

## Deploy

1. Push the folder to GitHub.
2. Import it into Vercel or another Next.js host whose plan permits your intended use.
3. Add all five variables from `.env.example` to the hosting environment. Use the production HTTPS URL for `NEXT_PUBLIC_SITE_URL`; store the service-role key and cookie secret only as server-side secrets.
4. Add your production URL to Supabase Auth allowed redirect URLs.
5. Deploy, then test seller registration, profile/location, listing creation, enquiry submission and admin moderation on mobile.

**Commercial hosting note:** Vercel Hobby is restricted to personal, non-commercial use. Since this marketplace supports commercial rice sales, select a plan/provider that permits commercial use before launching publicly. Database/storage free tiers also have quotas.

## Routes

- `/` — public marketplace
- `/rice/[id]` — rice listing detail
- `/interest/[id]` — buyer enquiry form
- `/report/[id]` — report a listing
- `/sell` — seller entry page
- `/register`, `/login` — seller authentication
- `/dashboard` — seller enquiries, listings and profile
- `/dashboard/listings/new` — create listing
- `/dashboard/listings/[id]/edit` — edit listing
- `/admin` — administrator sign-in, seller/listing/enquiry management, and report moderation
- `/robots.txt` and `/sitemap.xml` — crawler rules and public-page discovery

## Important current-scope notes

- Registration supports email/password or phone/password. Email confirmation or phone OTP verification behaviour depends on the Supabase Auth settings. To use phone/password, configure an SMS provider and allowed phone authentication in Supabase. A phone number used for login must match the phone identity used at registration. Seller contact phone is also saved in the profile. Phone verification and anti-abuse limits must be tested before production.
- Listing images currently use public image URLs. Configure validated Supabase Storage uploads before allowing direct user file uploads.
- The schema includes PostGIS geography and a spatial index, but the first UI searches by district/mandal/village text rather than GPS radius. Add coordinates and radius controls for true distance-based ranking.
- Enquiries are stored in the dashboard. SMS, email and WhatsApp outbound notifications are not configured; the UI does not falsely claim that a message has been sent.
- Add CAPTCHA/rate limiting for public enquiry/report functions before wide release, and complete a privacy policy, terms, deletion workflow and fluent Telugu review.
- RLS should be tested with separate anonymous, farmer, retailer and admin accounts before production.

## Brand

**RICE** is the Latin wordmark; **ధాన్యం (Dhanyam)** is its Telugu companion brand. The design uses agricultural greens, warm neutral surfaces and mobile-first layouts.
