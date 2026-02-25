-- ══════════════════════════════════════════════════════════════
-- ChoreRewards Database Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Families (one per parent account) ────────────────────────
create table families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_id    uuid references auth.users(id) on delete cascade,
  created_at  timestamptz default now()
);
alter table families enable row level security;
create policy "Families: owner full access"
  on families for all using (auth.uid() = owner_id);

-- ── Kids ─────────────────────────────────────────────────────
create table kids (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid references families(id) on delete cascade,
  name        text not null,
  age         int,
  color       text default '#e0623a',
  emoji       text default '⭐',
  tagline     text,
  created_at  timestamptz default now()
);
alter table kids enable row level security;
create policy "Kids: family owner access"
  on kids for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Chores ───────────────────────────────────────────────────
create table chores (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  name        text not null,
  icon        text default '⭐',
  pts         int not null default 5,
  frequency   text check (frequency in ('daily','weekly','monthly')) default 'daily',
  created_at  timestamptz default now()
);
alter table chores enable row level security;
create policy "Chores: family owner access"
  on chores for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Chore completions ─────────────────────────────────────────
create table chore_completions (
  id          uuid primary key default uuid_generate_v4(),
  chore_id    uuid references chores(id) on delete cascade,
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  completed_at timestamptz default now(),
  week_key    text,  -- e.g. "2024-W03" for weekly resets
  month_key   text   -- e.g. "2024-01" for monthly resets
);
alter table chore_completions enable row level security;
create policy "Completions: family owner access"
  on chore_completions for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── School grades ─────────────────────────────────────────────
create table school_grades (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  subject     text not null,
  grade       text not null,
  pts         int not null,
  logged_at   timestamptz default now()
);
alter table school_grades enable row level security;
create policy "Grades: family owner access"
  on school_grades for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Behavior deductions ───────────────────────────────────────
create table behavior_deductions (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  reason      text not null,
  pts         int not null,
  logged_at   timestamptz default now()
);
alter table behavior_deductions enable row level security;
create policy "Behavior: family owner access"
  on behavior_deductions for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Wallet transactions ───────────────────────────────────────
create table wallet_transactions (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  description text not null,
  amount      numeric(8,2) not null,
  type        text check (type in ('spend','bill','screen')) default 'spend',
  status      text check (status in ('pending','approved','denied')) default 'pending',
  created_at  timestamptz default now()
);
alter table wallet_transactions enable row level security;
create policy "Wallet: family owner access"
  on wallet_transactions for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Bills ─────────────────────────────────────────────────────
create table bills (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  name        text not null,
  amount      numeric(8,2) not null,
  due_date    text,
  status      text check (status in ('due','paid','overdue')) default 'due',
  created_at  timestamptz default now()
);
alter table bills enable row level security;
create policy "Bills: family owner access"
  on bills for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Goals / Wishlist ──────────────────────────────────────────
create table goals (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  name        text not null,
  emoji       text default '🎁',
  image_url   text,
  cost        numeric(8,2) not null,
  notes       text,
  priority    int default 0,
  created_at  timestamptz default now()
);
alter table goals enable row level security;
create policy "Goals: family owner access"
  on goals for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Extracurricular activities ────────────────────────────────
create table activities (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  name        text not null,
  icon        text default '⭐',
  pts_per_min numeric(4,2) default 1,
  created_at  timestamptz default now()
);
alter table activities enable row level security;
create policy "Activities: family owner access"
  on activities for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Activity sessions ─────────────────────────────────────────
create table activity_sessions (
  id          uuid primary key default uuid_generate_v4(),
  activity_id uuid references activities(id) on delete cascade,
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  minutes     int not null,
  pts         int not null,
  notes       text,
  status      text check (status in ('pending','approved','denied')) default 'pending',
  logged_at   timestamptz default now()
);
alter table activity_sessions enable row level security;
create policy "Sessions: family owner access"
  on activity_sessions for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

-- ── Screen time ───────────────────────────────────────────────
create table screen_time (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  budget_mins int default 60,
  date        date default current_date,
  earned_mins int default 0,
  used_mins   int default 0,
  updated_at  timestamptz default now(),
  unique(kid_id, date)
);
alter table screen_time enable row level security;
create policy "Screen time: family owner access"
  on screen_time for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );

create table screen_requests (
  id          uuid primary key default uuid_generate_v4(),
  kid_id      uuid references kids(id) on delete cascade,
  family_id   uuid references families(id) on delete cascade,
  minutes     int not null,
  cost        numeric(8,2),
  cost_type   text check (cost_type in ('pts','bal')) default 'pts',
  status      text check (status in ('pending','approved','denied')) default 'pending',
  date        date default current_date,
  created_at  timestamptz default now()
);
alter table screen_requests enable row level security;
create policy "Screen requests: family owner access"
  on screen_requests for all using (
    family_id in (select id from families where owner_id = auth.uid())
  );
