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
```

Then run `npm run dev` and open `http://localhost:3000`.

Without Supabase credentials, the public homepage displays clearly labelled illustrative demo listings. Demo enquiries are deliberately not saved.

## Configure Supabase

1. Create a new Supabase project.
2. Run the entire `supabase/schema.sql` file in Supabase SQL Editor.
3. Copy Project URL and the public publishable/anon key into `.env.local`.
4. In Authentication → URL Configuration, set Site URL to `http://localhost:3000` and add your production domain to allowed redirect URLs.
5. Register a seller using `/register`. If email confirmation is enabled, confirm the email before logging in.
6. In Dashboard → Profile, choose Telangana or Andhra Pradesh and enter the district. Save it before creating a listing.
7. Add a listing, open it in the public marketplace and submit a test enquiry using a test number. Confirm it appears in the seller dashboard.
8. To grant admin access, create a normal account and then run in SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

Admin access is never available through public registration. Do not put a Supabase service-role/secret key in browser code or any `NEXT_PUBLIC_*` variable.

## Deploy

1. Push the folder to GitHub.
2. Import it into Vercel or another Next.js host whose plan permits your intended use.
3. Add the three variables from `.env.example` to the hosting environment.
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
- `/admin` — report moderation

## Important current-scope notes

- Registration supports email/password or phone/password. Email confirmation or phone OTP verification behaviour depends on the Supabase Auth settings. To use phone/password, configure an SMS provider and allowed phone authentication in Supabase. A phone number used for login must match the phone identity used at registration. Seller contact phone is also saved in the profile. Phone verification and anti-abuse limits must be tested before production.
- Listing images currently use public image URLs. Configure validated Supabase Storage uploads before allowing direct user file uploads.
- The schema includes PostGIS geography and a spatial index, but the first UI searches by district/mandal/village text rather than GPS radius. Add coordinates and radius controls for true distance-based ranking.
- Enquiries are stored in the dashboard. SMS, email and WhatsApp outbound notifications are not configured; the UI does not falsely claim that a message has been sent.
- Add CAPTCHA/rate limiting for public enquiry/report functions before wide release, and complete a privacy policy, terms, deletion workflow and fluent Telugu review.
- RLS should be tested with separate anonymous, farmer, retailer and admin accounts before production.

## Brand

**RICE** is the Latin wordmark; **ధాన్యం (Dhanyam)** is its Telugu companion brand. The design uses agricultural greens, warm neutral surfaces and mobile-first layouts.
