-- 005_localStorage_migration.sql
-- localStorage 기반 store → Supabase 마이그레이션
-- 생성 테이블: site_settings, faqs, blocked_slots, cost_categories, fixed_costs

-- 1. site_settings: key-value 설정 저장소
create table if not exists site_settings (
  tenant_id uuid references tenants(id) on delete cascade,
  key       text not null,
  value     jsonb not null default '{}',
  updated_at timestamptz default now(),
  primary key (tenant_id, key)
);

alter table site_settings enable row level security;

-- 2. faqs
create table if not exists faqs (
  id         uuid primary key default uuid_generate_v4(),
  tenant_id  uuid references tenants(id) on delete cascade,
  q          text not null,
  a          text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table faqs enable row level security;

-- 3. blocked_slots
create table if not exists blocked_slots (
  id        uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  date      date not null,
  time      text not null,
  unique(tenant_id, date, time)
);

alter table blocked_slots enable row level security;

-- 4. cost_categories
create table if not exists cost_categories (
  id         text not null,
  tenant_id  uuid references tenants(id) on delete cascade,
  label      text not null,
  color      text not null default '#6B7280',
  active     boolean default true,
  is_default boolean default false,
  sort_order integer default 0,
  primary key (tenant_id, id)
);

alter table cost_categories enable row level security;

-- 5. fixed_costs
create table if not exists fixed_costs (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid references tenants(id) on delete cascade,
  name         text not null,
  category     text not null,
  amount       integer not null,
  billing_cycle text default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  memo         text,
  active       boolean default true,
  created_at   timestamptz default now()
);

alter table fixed_costs enable row level security;
