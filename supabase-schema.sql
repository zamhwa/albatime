-- ============================================
-- AlbaCheck Supabase Schema
-- ============================================

-- 1. profiles (회원)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  phone text default '',
  created_at timestamptz default now()
);

-- 2. stores (매장)
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) not null,
  name text not null,
  business_type text default '카페',
  address text default '',
  break_rules jsonb default '[{"minHours":4,"breakMinutes":30},{"minHours":8,"breakMinutes":60}]'::jsonb,
  pay_period_start int default 1,
  options jsonb default '{"nightPay":false,"overtimePay":false,"holidayPay":false,"nightPayRate":1.5,"overtimePayRate":1.5,"holidayPayRate":1.5,"roundingRule":"none"}'::jsonb,
  qr_secret text default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- 3. workers (알바생 - 매장별)
create table workers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  user_id uuid references profiles(id),
  name text not null,
  phone text default '',
  wage_type text default 'hourly' check (wage_type in ('hourly', 'monthly')),
  hourly_wage int default 10030,
  monthly_wage int default 0,
  status text default 'active' check (status in ('active', 'inactive')),
  color text default '#3B82F6',
  allowances jsonb default '{"weeklyHolidayPay":true,"nightPay":true,"overtimePay":true,"holidayPay":true}'::jsonb,
  joined_at timestamptz default now()
);

-- 4. invite_codes (초대코드)
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  worker_id uuid references workers(id) on delete cascade,
  code text unique not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- 5. attendances (출퇴근)
create table attendances (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(id) on delete cascade not null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  break_minutes int default 0,
  actual_work_minutes int default 0,
  method text default 'qr' check (method in ('qr', 'manual')),
  note text default ''
);

-- 6. schedules (스케줄)
create table schedules (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null
);

-- 7. contracts (근로계약서)
create table contracts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  worker_id uuid references workers(id) on delete cascade not null,
  start_date date not null,
  end_date date,
  work_location text default '',
  job_description text default '',
  work_days text[] default '{}',
  work_hours jsonb default '{"start":"09:00","end":"18:00"}'::jsonb,
  break_time int default 60,
  hourly_wage int default 10030,
  pay_day int default 10,
  pay_method text default '계좌이체',
  owner_signature text,
  worker_signature text,
  signed_at timestamptz,
  status text default 'draft' check (status in ('draft', 'sent', 'signed')),
  created_at timestamptz default now()
);

-- 8. sales_records (매출)
create table sales_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  date date not null,
  amount int default 0,
  memo text default ''
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table profiles enable row level security;
alter table stores enable row level security;
alter table workers enable row level security;
alter table invite_codes enable row level security;
alter table attendances enable row level security;
alter table schedules enable row level security;
alter table contracts enable row level security;
alter table sales_records enable row level security;

-- profiles: 본인만 읽기/수정
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- stores: 소유자 + 소속 알바생 읽기, 소유자만 수정
create policy "stores_select" on stores for select using (
  owner_id = auth.uid() or
  id in (select store_id from workers where user_id = auth.uid())
);
create policy "stores_insert" on stores for insert with check (owner_id = auth.uid());
create policy "stores_update" on stores for update using (owner_id = auth.uid());
create policy "stores_delete" on stores for delete using (owner_id = auth.uid());

-- workers: 매장 소유자 + 본인
create policy "workers_select" on workers for select using (
  store_id in (select id from stores where owner_id = auth.uid()) or
  user_id = auth.uid()
);
create policy "workers_insert" on workers for insert with check (
  store_id in (select id from stores where owner_id = auth.uid())
);
create policy "workers_update" on workers for update using (
  store_id in (select id from stores where owner_id = auth.uid()) or
  user_id = auth.uid()
);
create policy "workers_delete" on workers for delete using (
  store_id in (select id from stores where owner_id = auth.uid())
);

-- invite_codes: 매장 소유자 생성, 누구나 조회 (코드로)
create policy "invite_select" on invite_codes for select using (true);
create policy "invite_insert" on invite_codes for insert with check (
  store_id in (select id from stores where owner_id = auth.uid())
);
create policy "invite_update" on invite_codes for update using (true);

-- attendances: 매장 소유자 + 본인 알바생
create policy "att_select" on attendances for select using (
  worker_id in (select id from workers where store_id in (select id from stores where owner_id = auth.uid())) or
  worker_id in (select id from workers where user_id = auth.uid())
);
create policy "att_insert" on attendances for insert with check (
  worker_id in (select id from workers where user_id = auth.uid()) or
  worker_id in (select id from workers where store_id in (select id from stores where owner_id = auth.uid()))
);
create policy "att_update" on attendances for update using (
  worker_id in (select id from workers where user_id = auth.uid()) or
  worker_id in (select id from workers where store_id in (select id from stores where owner_id = auth.uid()))
);

-- schedules: 매장 소유자 + 본인
create policy "sched_select" on schedules for select using (
  worker_id in (select id from workers where store_id in (select id from stores where owner_id = auth.uid())) or
  worker_id in (select id from workers where user_id = auth.uid())
);
create policy "sched_insert" on schedules for insert with check (
  worker_id in (select id from workers where store_id in (select id from stores where owner_id = auth.uid()))
);
create policy "sched_update" on schedules for update using (
  worker_id in (select id from workers where store_id in (select id from stores where owner_id = auth.uid()))
);
create policy "sched_delete" on schedules for delete using (
  worker_id in (select id from workers where store_id in (select id from stores where owner_id = auth.uid()))
);

-- contracts: 매장 소유자 + 해당 알바생
create policy "contract_select" on contracts for select using (
  store_id in (select id from stores where owner_id = auth.uid()) or
  worker_id in (select id from workers where user_id = auth.uid())
);
create policy "contract_insert" on contracts for insert with check (
  store_id in (select id from stores where owner_id = auth.uid())
);
create policy "contract_update" on contracts for update using (
  store_id in (select id from stores where owner_id = auth.uid()) or
  worker_id in (select id from workers where user_id = auth.uid())
);

-- sales_records: 매장 소유자만
create policy "sales_select" on sales_records for select using (
  store_id in (select id from stores where owner_id = auth.uid())
);
create policy "sales_insert" on sales_records for insert with check (
  store_id in (select id from stores where owner_id = auth.uid())
);
create policy "sales_update" on sales_records for update using (
  store_id in (select id from stores where owner_id = auth.uid())
);

-- ============================================
-- Auto-create profile on signup
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
