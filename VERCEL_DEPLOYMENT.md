# RICE — Dhanyam deployment

1. Create Supabase project and run `supabase/schema.sql` in SQL Editor.
2. Create `.env.local` from `.env.example` and add the Supabase URL + public key.
3. Run `npm install` and `npm run build` locally.
4. Push to GitHub and import the repository into Vercel or a commercially permitted Next.js host.
5. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` in host settings.
6. Add the production URL to Supabase Auth's allowed redirect URLs.
7. Deploy and test the full flow on real Android and iOS browsers.
8. Create an admin by promoting a normal account in Supabase SQL Editor; never enable admin self-registration.

Do not put service-role secrets in browser-visible environment variables. Keep RLS enabled.
