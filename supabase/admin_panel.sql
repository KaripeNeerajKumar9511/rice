-- Apply after schema.sql to enable the admin seller/listing/enquiry workspace.
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_role public.seller_role;
begin
  safe_role := case
    when new.raw_user_meta_data->>'role' = 'retailer' then 'retailer'::public.seller_role
    else 'farmer'::public.seller_role
  end;

  insert into public.profiles(id, role, full_name, phone, preferred_language, email)
  values (
    new.id,
    safe_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    case when new.raw_user_meta_data->>'preferred_language' = 'te' then 'te' else 'en' end,
    new.email
  )
  on conflict(id) do update set email = excluded.email;

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_profile_email();

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.rice_listings(id) on delete set null,
  listing_title text not null,
  note text not null check (char_length(note) between 3 and 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_seller_created_idx
  on public.admin_notifications(seller_id, created_at desc);

create or replace function public.prevent_seller_unarchive_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'archived'
     and new.status <> 'archived'
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Archived listings require administrator approval';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_seller_unarchive_listing on public.rice_listings;
create trigger prevent_seller_unarchive_listing
before update of status on public.rice_listings
for each row
execute function public.prevent_seller_unarchive_listing();

alter table public.admin_notifications enable row level security;

drop policy if exists "seller and admin read admin notifications" on public.admin_notifications;
create policy "seller and admin read admin notifications"
  on public.admin_notifications
  for select
  to authenticated
  using (seller_id = auth.uid() or public.is_admin());

revoke all on public.admin_notifications from public, anon, authenticated;
grant select on public.admin_notifications to authenticated;

create or replace function public.admin_archive_listing(p_listing_id uuid, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.rice_listings%rowtype;
  notification_id uuid;
  clean_note text := trim(coalesce(p_note, ''));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if char_length(clean_note) not between 3 and 1000 then
    raise exception 'The note must be between 3 and 1000 characters';
  end if;

  select *
  into listing_row
  from public.rice_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  if listing_row.status = 'archived' then
    raise exception 'Listing is already removed';
  end if;

  update public.rice_listings
  set status = 'archived'
  where id = listing_row.id;

  insert into public.admin_notifications (
    seller_id, listing_id, listing_title, note, created_by
  )
  values (
    listing_row.seller_id, listing_row.id, listing_row.title, clean_note, auth.uid()
  )
  returning id into notification_id;

  insert into public.audit_logs (
    actor_id, action, target_table, target_id, reason, metadata
  )
  values (
    auth.uid(),
    'listing_archived',
    'rice_listings',
    listing_row.id,
    clean_note,
    jsonb_build_object('seller_id', listing_row.seller_id, 'listing_title', listing_row.title)
  );

  return notification_id;
end;
$$;

revoke all on function public.admin_archive_listing(uuid, text) from public, anon;
grant execute on function public.admin_archive_listing(uuid, text) to authenticated;

-- Aggregate privacy-preserving visitor counts; no IP address, user agent, or page path is stored.
create table if not exists public.daily_visitor_stats (
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  visit_date date not null default (now() at time zone 'utc')::date,
  page_views integer not null default 1 check (page_views > 0),
  created_at timestamptz not null default now(),
  primary key (visitor_hash, visit_date)
);

alter table public.daily_visitor_stats enable row level security;
revoke all on public.daily_visitor_stats from public, anon, authenticated;

create or replace function public.record_visitor_visit(p_visitor_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service access required';
  end if;

  if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid visitor identifier';
  end if;

  insert into public.daily_visitor_stats(visitor_hash, visit_date, page_views)
  values (p_visitor_hash, (now() at time zone 'utc')::date, 1)
  on conflict (visitor_hash, visit_date)
  do update set page_views = public.daily_visitor_stats.page_views + 1;

  delete from public.daily_visitor_stats
  where visit_date < (now() at time zone 'utc')::date - 400;
end;
$$;

revoke all on function public.record_visitor_visit(text) from public, anon, authenticated;
grant execute on function public.record_visitor_visit(text) to service_role;

create or replace function public.admin_get_visitor_analytics(p_days integer)
returns table (
  visit_date date,
  unique_visitors bigint,
  page_views bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_days not between 1 and 90 then
    raise exception 'Choose a date range between 1 and 90 days';
  end if;

  return query
  with calendar as (
    select dates.day_value::date as visit_date
    from generate_series(
      current_date - (p_days - 1),
      current_date,
      interval '1 day'
    ) as dates(day_value)
  ),
  daily as (
    select stats.visit_date,
      count(distinct stats.visitor_hash)::bigint as unique_visitors,
      coalesce(sum(stats.page_views), 0)::bigint as page_views
    from public.daily_visitor_stats stats
    where stats.visit_date >= current_date - (p_days - 1)
      and stats.visit_date <= current_date
    group by stats.visit_date
  )
  select calendar.visit_date,
    coalesce(daily.unique_visitors, 0)::bigint,
    coalesce(daily.page_views, 0)::bigint
  from calendar
  left join daily using (visit_date)
  order by calendar.visit_date;
end;
$$;

revoke all on function public.admin_get_visitor_analytics(integer) from public, anon;
grant execute on function public.admin_get_visitor_analytics(integer) to authenticated;
