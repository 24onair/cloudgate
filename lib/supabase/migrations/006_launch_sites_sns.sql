-- 006_launch_sites_sns.sql
-- localStorage 나머지 → Supabase 마이그레이션
-- 생성 테이블: launch_sites, sns_posts, sns_shorts
-- sns_profile 은 site_settings(key='sns_profile') 재사용

-- 1. launch_sites
create table if not exists launch_sites (
  id              text not null,
  tenant_id       uuid references tenants(id) on delete cascade,
  name            text not null,
  location        text not null default '',
  nx              integer not null default 0,
  ny              integer not null default 0,
  lat             double precision,
  lng             double precision,
  altitude        integer default 0,
  wind_directions jsonb not null default '{}',
  active          boolean default true,
  sort_order      integer default 0,
  created_at      timestamptz default now(),
  primary key (tenant_id, id)
);

alter table launch_sites enable row level security;

-- 2. sns_posts (인스타그램 게시물)
create table if not exists sns_posts (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  image_url   text not null default '',
  caption     text not null default '',
  link        text not null default '',
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

alter table sns_posts enable row level security;

-- 3. sns_shorts (유튜브 쇼츠)
create table if not exists sns_shorts (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  video_id    text not null,
  title       text not null default '',
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

alter table sns_shorts enable row level security;
