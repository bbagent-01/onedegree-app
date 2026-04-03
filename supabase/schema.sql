-- One Degree BNB — Full Schema
-- Run this in the Supabase SQL Editor to set up all tables + RLS

-- ============================================================
-- TABLES
-- ============================================================

-- Users (synced from Clerk via webhook)
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  clerk_id    text unique not null,
  name        text not null,
  email       text unique not null,
  avatar_url  text,
  bio         text,
  role        text check (role in ('host', 'guest', 'both')),
  trust_score numeric default 0,
  created_at  timestamptz default now()
);

-- Vouches (the trust graph)
create table if not exists vouches (
  id                uuid primary key default gen_random_uuid(),
  voucher_id        uuid references users(id) on delete cascade,
  vouchee_id        uuid references users(id) on delete cascade,
  trust_level       integer not null check (trust_level in (1, 5, 6, 7, 8, 9, 10)),
  years_known       integer,
  reputation_stake  integer check (reputation_stake between 1 and 10),
  confirmed_at      timestamptz,
  created_at        timestamptz default now(),
  unique (voucher_id, vouchee_id)
);

-- Invites (separate from vouches)
create table if not exists invites (
  id          uuid primary key default gen_random_uuid(),
  inviter_id  uuid references users(id) on delete cascade,
  email       text not null,
  token       text unique not null,
  status      text check (status in ('pending', 'accepted')) default 'pending',
  created_at  timestamptz default now()
);

-- Listings
create table if not exists listings (
  id                  uuid primary key default gen_random_uuid(),
  host_id             uuid references users(id) on delete cascade,
  title               text not null,
  description         text,
  area_name           text,
  address             text,
  price_per_night     numeric,
  preview_visibility  text check (preview_visibility in ('open', 'network', 'strong', 'invite')) default 'open',
  full_visibility     text check (full_visibility in ('open', 'network', 'strong', 'invite')) default 'network',
  min_trust_score     integer,
  house_rules         text,
  amenities           text[],
  availability_start  date,
  availability_end    date,
  is_active           boolean default true,
  created_at          timestamptz default now()
);

-- Listing photos
create table if not exists listing_photos (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references listings(id) on delete cascade,
  url         text not null,
  is_preview  boolean default false,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- Contact requests
create table if not exists contact_requests (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references listings(id),
  guest_id    uuid references users(id),
  message     text,
  check_in    date,
  check_out   date,
  status      text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at  timestamptz default now()
);

-- Stay confirmations
create table if not exists stay_confirmations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid references listings(id),
  host_id         uuid references users(id),
  guest_id        uuid references users(id),
  host_confirmed  boolean default false,
  guest_confirmed boolean default false,
  host_rating     integer check (host_rating between 1 and 10),
  guest_rating    integer check (guest_rating between 1 and 10),
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_vouches_voucher on vouches(voucher_id);
create index if not exists idx_vouches_vouchee on vouches(vouchee_id);
create index if not exists idx_listings_host on listings(host_id);
create index if not exists idx_invites_email on invites(email);
create index if not exists idx_contact_requests_listing on contact_requests(listing_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table vouches enable row level security;
alter table invites enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table contact_requests enable row level security;
alter table stay_confirmations enable row level security;

-- Users: anyone can read (needed for trust network lookups), own row update
create policy "Users are viewable by authenticated users"
  on users for select to authenticated using (true);

create policy "Users can update own row"
  on users for update to authenticated using (clerk_id = auth.jwt() ->> 'sub');

-- Vouches: readable by voucher or vouchee, insertable by authenticated
create policy "Vouches viewable by participants"
  on vouches for select to authenticated
  using (
    voucher_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
    or vouchee_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
  );

create policy "Authenticated users can create vouches"
  on vouches for insert to authenticated
  with check (voucher_id in (select id from users where clerk_id = auth.jwt() ->> 'sub'));

-- Invites: viewable by inviter, insertable by authenticated
create policy "Invites viewable by inviter"
  on invites for select to authenticated
  using (inviter_id in (select id from users where clerk_id = auth.jwt() ->> 'sub'));

create policy "Authenticated users can create invites"
  on invites for insert to authenticated
  with check (inviter_id in (select id from users where clerk_id = auth.jwt() ->> 'sub'));

-- Listings: open preview visibility readable by all authenticated (MVP simplification)
create policy "Active listings are viewable"
  on listings for select to authenticated
  using (is_active = true);

create policy "Hosts can insert own listings"
  on listings for insert to authenticated
  with check (host_id in (select id from users where clerk_id = auth.jwt() ->> 'sub'));

create policy "Hosts can update own listings"
  on listings for update to authenticated
  using (host_id in (select id from users where clerk_id = auth.jwt() ->> 'sub'));

-- Listing photos: viewable with listing, manageable by host
create policy "Listing photos viewable with listing"
  on listing_photos for select to authenticated using (true);

create policy "Hosts can manage own listing photos"
  on listing_photos for insert to authenticated
  with check (
    listing_id in (
      select id from listings
      where host_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- Contact requests: viewable by host or guest
create policy "Contact requests viewable by participants"
  on contact_requests for select to authenticated
  using (
    guest_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
    or listing_id in (
      select id from listings
      where host_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
    )
  );

create policy "Guests can create contact requests"
  on contact_requests for insert to authenticated
  with check (guest_id in (select id from users where clerk_id = auth.jwt() ->> 'sub'));

-- Stay confirmations: viewable by host or guest
create policy "Stay confirmations viewable by participants"
  on stay_confirmations for select to authenticated
  using (
    host_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
    or guest_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
  );

create policy "Participants can insert stay confirmations"
  on stay_confirmations for insert to authenticated
  with check (
    host_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
    or guest_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
  );

create policy "Participants can update stay confirmations"
  on stay_confirmations for update to authenticated
  using (
    host_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
    or guest_id in (select id from users where clerk_id = auth.jwt() ->> 'sub')
  );
