-- RICE / Dhanyam schema. Run once in a new Supabase project's SQL Editor.
create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;
create type public.seller_role as enum ('farmer','retailer','admin');
create type public.listing_status as enum ('active','paused','unavailable','hidden','archived');
create type public.enquiry_status as enum ('new','contacted','negotiating','completed','unreachable','cancelled');

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 role public.seller_role not null default 'farmer', full_name text not null default '', phone text,
 preferred_language text not null default 'en' check(preferred_language in ('en','te')),
 account_status text not null default 'active' check(account_status in ('active','suspended','disabled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.seller_locations(
 id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.profiles(id) on delete cascade,
 state_code text not null check(state_code in ('TS','AP')),district text not null,mandal text,village text,postal_code text,
 location extensions.geography(Point,4326),is_public boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index seller_locations_seller_idx on public.seller_locations(seller_id);
create index seller_locations_geo_idx on public.seller_locations using gist(location);
create index seller_locations_district_idx on public.seller_locations(lower(district));
create table public.rice_varieties(id uuid primary key default gen_random_uuid(),name_en text not null,name_te text not null,slug text unique not null,is_active boolean not null default true,sort_order int not null default 0,created_at timestamptz not null default now());
insert into public.rice_varieties(name_en,name_te,slug,sort_order) values ('Sona Masoori','సోనా మసూరి','sona-masoori',1),('HMT','హెచ్‌ఎమ్‌టీ','hmt',2),('Basmati','బాస్మతి','basmati',3),('Jeera Samba','జీరా సాంబా','jeera-samba',4),('RNR / Telangana Sona','ఆర్‌ఎన్‌ఆర్ / తెలంగాణ సోనా','rnr-telangana-sona',5),('Other variety','ఇతర రకం','other',99) on conflict(slug) do nothing;
create table public.rice_listings(
 id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.profiles(id) on delete cascade,
 variety_id uuid references public.rice_varieties(id) on delete set null,location_id uuid not null references public.seller_locations(id) on delete restrict,
 title text not null check(char_length(title) between 2 and 120),title_te text,description text,
 rice_type text not null default 'raw' check(rice_type in ('raw','boiled','steamed','other')),
 price_amount numeric(12,2) not null check(price_amount>0),price_unit text not null check(price_unit in ('kg','quintal','bag')),
 bag_weight_kg numeric(8,2) check(bag_weight_kg is null or bag_weight_kg>0),stock_quantity numeric(12,2) not null check(stock_quantity>=0),
 stock_unit text not null check(stock_unit in ('kg','quintal','bag')),minimum_order_quantity numeric(12,2) check(minimum_order_quantity is null or minimum_order_quantity>0),
 minimum_order_unit text check(minimum_order_unit is null or minimum_order_unit in ('kg','quintal','bag')),
 fulfilment_options text[] not null default array['pickup']::text[],status public.listing_status not null default 'active',published_at timestamptz,
 last_stock_updated_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(cardinality(fulfilment_options)>0),check(price_unit<>'bag' or bag_weight_kg is not null)
);
create index rice_listings_seller_idx on public.rice_listings(seller_id,created_at desc);
create index rice_listings_active_idx on public.rice_listings(status,published_at desc) where status='active';
create index rice_listings_price_idx on public.rice_listings(price_amount) where status='active';
create index rice_listings_variety_idx on public.rice_listings(variety_id) where status='active';
create table public.listing_images(id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.rice_listings(id) on delete cascade,seller_id uuid not null references public.profiles(id) on delete cascade,image_url text not null,alt_text text,sort_order int not null default 0,created_at timestamptz not null default now());
create index listing_images_listing_idx on public.listing_images(listing_id,sort_order);
create table public.enquiries(
 id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.rice_listings(id) on delete restrict,seller_id uuid not null references public.profiles(id) on delete restrict,
 buyer_name text not null check(char_length(buyer_name) between 2 and 100),buyer_phone text not null check(char_length(buyer_phone) between 10 and 16),buyer_location text not null check(char_length(buyer_location) between 2 and 120),buyer_address text,requested_quantity text,buyer_message text,consent_at timestamptz not null default now(),status public.enquiry_status not null default 'new',seller_notes text,listing_title_snapshot text not null,price_snapshot numeric(12,2),price_unit_snapshot text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index enquiries_seller_idx on public.enquiries(seller_id,status,created_at desc);
create index enquiries_listing_idx on public.enquiries(listing_id,created_at desc);
create table public.reports(id uuid primary key default gen_random_uuid(),listing_id uuid not null references public.rice_listings(id) on delete cascade,reason text not null check(reason in ('incorrect_price','unavailable_stock','suspicious_seller','misleading_information','other')),details text,status text not null default 'open' check(status in ('open','reviewed','dismissed')),reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,created_at timestamptz not null default now());
create index reports_status_idx on public.reports(status,created_at desc);
create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),action text not null,target_table text not null,target_id uuid,reason text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger seller_locations_updated_at before update on public.seller_locations for each row execute function public.set_updated_at();
create trigger rice_listings_updated_at before update on public.rice_listings for each row execute function public.set_updated_at();
create trigger enquiries_updated_at before update on public.enquiries for each row execute function public.set_updated_at();
-- Security-definer helper avoids recursive profile-policy checks.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and account_status='active') $$;
create or replace function public.prevent_self_role_change() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then raise exception 'Role changes require administrator approval';end if;return new;end $$;
create trigger prevent_profile_role_change before update of role on public.profiles for each row execute function public.prevent_self_role_change();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ declare safe_role public.seller_role;begin safe_role:=case when new.raw_user_meta_data->>'role'='retailer' then 'retailer'::public.seller_role else 'farmer'::public.seller_role end;insert into public.profiles(id,role,full_name,phone,preferred_language) values(new.id,safe_role,coalesce(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'phone',''),case when new.raw_user_meta_data->>'preferred_language'='te' then 'te' else 'en' end) on conflict(id) do nothing;return new;end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Listing-only public view. It deliberately excludes phone, address and internal user data.
create or replace view public.public_listings as select l.id,l.seller_id,l.variety_id,l.title,l.title_te,l.description,l.rice_type,l.price_amount,l.price_unit,l.bag_weight_kg,l.stock_quantity,l.stock_unit,l.minimum_order_quantity,l.minimum_order_unit,l.fulfilment_options,l.status,l.published_at,l.last_stock_updated_at,l.created_at,p.full_name as seller_name,p.role as seller_role,loc.state_code,loc.district,loc.mandal,loc.village,(select i.image_url from public.listing_images i where i.listing_id=l.id order by i.sort_order,i.created_at limit 1) as image_url from public.rice_listings l join public.profiles p on p.id=l.seller_id join public.seller_locations loc on loc.id=l.location_id where l.status='active' and l.stock_quantity>0 and p.account_status='active' and loc.is_public=true;
create or replace view public.seller_enquiries_view with (security_invoker=true) as select e.id,e.listing_id,e.seller_id,e.buyer_name,e.buyer_phone,e.buyer_location,e.buyer_address,e.requested_quantity,e.buyer_message,e.status,e.seller_notes,e.created_at,e.updated_at,e.listing_title_snapshot,e.price_snapshot,e.price_unit_snapshot from public.enquiries e;
create or replace view public.admin_reports_view with (security_invoker=true) as select r.id,r.listing_id,r.reason,r.details,r.status,r.created_at,l.title as listing_title,l.seller_id from public.reports r join public.rice_listings l on l.id=r.listing_id where r.status='open';

-- Public buyer enquiry function derives seller from the listing, captures price/title snapshot and throttles repeats.
create or replace function public.create_buyer_enquiry(p_listing_id uuid,p_buyer_name text,p_buyer_phone text,p_buyer_location text,p_buyer_address text default null,p_requested_quantity text default null,p_buyer_message text default null,p_consent boolean default false) returns uuid language plpgsql security definer set search_path=public as $$ declare l public.rice_listings%rowtype;new_id uuid;begin
 if not p_consent then raise exception 'Consent is required';end if;if length(trim(coalesce(p_buyer_name,'')))<2 or length(trim(coalesce(p_buyer_location,'')))<2 then raise exception 'Name and location are required';end if;if length(regexp_replace(coalesce(p_buyer_phone,''),'[^0-9]','','g')) not between 10 and 13 then raise exception 'Invalid phone number';end if;
 select * into l from public.rice_listings where id=p_listing_id and status='active' and stock_quantity>0 for share;if not found then raise exception 'Listing is no longer available';end if;
 if exists(select 1 from public.enquiries e where e.listing_id=p_listing_id and regexp_replace(e.buyer_phone,'[^0-9]','','g')=regexp_replace(p_buyer_phone,'[^0-9]','','g') and e.created_at>now()-interval '15 minutes') then raise exception 'Similar enquiry submitted recently';end if;
 insert into public.enquiries(listing_id,seller_id,buyer_name,buyer_phone,buyer_location,buyer_address,requested_quantity,buyer_message,consent_at,status,listing_title_snapshot,price_snapshot,price_unit_snapshot) values(l.id,l.seller_id,trim(p_buyer_name),trim(p_buyer_phone),trim(p_buyer_location),nullif(trim(coalesce(p_buyer_address,'')),''),nullif(trim(coalesce(p_requested_quantity,'')),''),nullif(trim(coalesce(p_buyer_message,'')),''),now(),'new',l.title,l.price_amount,l.price_unit) returning id into new_id;return new_id;end $$;
revoke all on function public.create_buyer_enquiry(uuid,text,text,text,text,text,text,boolean) from public;grant execute on function public.create_buyer_enquiry(uuid,text,text,text,text,text,text,boolean) to anon,authenticated;
create or replace function public.submit_listing_report(p_listing_id uuid,p_reason text,p_details text default null) returns uuid language plpgsql security definer set search_path=public as $$ declare new_id uuid;begin if p_reason not in ('incorrect_price','unavailable_stock','suspicious_seller','misleading_information','other') then raise exception 'Invalid report reason';end if;if not exists(select 1 from public.rice_listings where id=p_listing_id and status in ('active','paused','unavailable')) then raise exception 'Listing not found';end if;insert into public.reports(listing_id,reason,details) values(p_listing_id,p_reason,nullif(trim(coalesce(p_details,'')),'')) returning id into new_id;return new_id;end $$;
revoke all on function public.submit_listing_report(uuid,text,text) from public;grant execute on function public.submit_listing_report(uuid,text,text) to anon,authenticated;
create or replace function public.upsert_my_seller_location(p_state_code text,p_district text,p_mandal text,p_village text) returns uuid language plpgsql security definer set search_path=public as $$ declare uid uuid;loc_id uuid;begin uid:=auth.uid();if uid is null then raise exception 'Not authenticated';end if;if p_state_code not in ('TS','AP') or length(trim(coalesce(p_district,'')))<2 then raise exception 'Choose a state and enter district';end if;select id into loc_id from public.seller_locations where seller_id=uid order by created_at limit 1;if loc_id is null then insert into public.seller_locations(seller_id,state_code,district,mandal,village) values(uid,p_state_code,trim(p_district),nullif(trim(coalesce(p_mandal,'')),''),nullif(trim(coalesce(p_village,'')),'')) returning id into loc_id;else update public.seller_locations set state_code=p_state_code,district=trim(p_district),mandal=nullif(trim(coalesce(p_mandal,'')),''),village=nullif(trim(coalesce(p_village,'')),'') where id=loc_id and seller_id=uid;end if;return loc_id;end $$;
revoke all on function public.upsert_my_seller_location(text,text,text,text) from public;grant execute on function public.upsert_my_seller_location(text,text,text,text) to authenticated;

alter table public.profiles enable row level security;alter table public.seller_locations enable row level security;alter table public.rice_varieties enable row level security;alter table public.rice_listings enable row level security;alter table public.listing_images enable row level security;alter table public.enquiries enable row level security;alter table public.reports enable row level security;alter table public.audit_logs enable row level security;
create policy "profile self read" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy "profile self update no role change" on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin()) with check((id=auth.uid() and role in ('farmer','retailer')) or public.is_admin());
create policy "locations owner manage" on public.seller_locations for all to authenticated using(seller_id=auth.uid() or public.is_admin()) with check(seller_id=auth.uid() or public.is_admin());
create policy "varieties public read" on public.rice_varieties for select to anon,authenticated using(is_active or public.is_admin());
create policy "listings public or owner read" on public.rice_listings for select to anon,authenticated using((status='active' and stock_quantity>0) or seller_id=auth.uid() or public.is_admin());
create policy "seller insert listing" on public.rice_listings for insert to authenticated with check(seller_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('farmer','retailer') and p.account_status='active') and exists(select 1 from public.seller_locations x where x.id=location_id and x.seller_id=auth.uid()));
create policy "seller update listing" on public.rice_listings for update to authenticated using(seller_id=auth.uid() or public.is_admin()) with check((seller_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('farmer','retailer') and p.account_status='active') and exists(select 1 from public.seller_locations loc where loc.id=location_id and loc.seller_id=auth.uid())) or public.is_admin());
create policy "seller delete listing" on public.rice_listings for delete to authenticated using(seller_id=auth.uid() or public.is_admin());
create policy "listing images read" on public.listing_images for select to anon,authenticated using(exists(select 1 from public.rice_listings l where l.id=listing_id and (l.status='active' or l.seller_id=auth.uid() or public.is_admin())));
create policy "seller manages images" on public.listing_images for all to authenticated using(seller_id=auth.uid() or public.is_admin()) with check((seller_id=auth.uid() and exists(select 1 from public.rice_listings l where l.id=listing_id and l.seller_id=auth.uid())) or public.is_admin());
create policy "seller reads enquiries" on public.enquiries for select to authenticated using(seller_id=auth.uid() or public.is_admin());
create policy "seller updates followup only" on public.enquiries for update to authenticated using(seller_id=auth.uid() or public.is_admin()) with check(seller_id=auth.uid() or public.is_admin());
create policy "admin reads reports" on public.reports for select to authenticated using(public.is_admin());
create policy "admin updates reports" on public.reports for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admin reads audit logs" on public.audit_logs for select to authenticated using(public.is_admin());

grant select on public.public_listings to anon,authenticated;grant select on public.seller_enquiries_view,public.admin_reports_view to authenticated;grant select on public.rice_varieties to anon,authenticated;grant select,insert,update,delete on public.rice_listings,public.listing_images,public.seller_locations to authenticated;grant select on public.enquiries to authenticated;revoke update on public.enquiries from authenticated;grant update(status,seller_notes) on public.enquiries to authenticated;grant select,update on public.reports to authenticated;grant select,update on public.profiles to authenticated;grant select on public.audit_logs to authenticated;revoke update on public.profiles from authenticated;grant update(full_name,phone,preferred_language) on public.profiles to authenticated;
-- Admin setup: create a normal account first, then run in SQL Editor:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');
