-- MyPantryPal database schema
-- Created by Daria Pugacheva. © 2026 MyPantryPal. All rights reserved.
-- Every user-owned table has Row Level Security: a user can only read and change their own rows.

create extension if not exists pgcrypto;

-- ---------- profiles & preferences ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  age int check (age is null or age between 13 and 120),
  currency text not null default 'USD',
  onboarded boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  allergies text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  dietary_preferences text[] not null default '{}',
  preferred_cuisines text[] not null default '{}',
  foods_to_avoid text[] not null default '{}',
  fitness_preference text not null default '',
  nutrition_goals jsonb not null default '{"calories":2200,"protein":100,"carbohydrates":250,"fat":70,"water_ml":2000}',
  grocery_preferences jsonb not null default '{"stores":[],"habits":""}',
  budget_settings jsonb not null default '{"weekly":60,"monthly":240}',
  notification_settings jsonb not null default '{"expiration":true,"shopping":true,"budget":true,"vitamins":true,"weekly_report":true}',
  updated_at timestamptz not null default now()
);

-- ---------- fridge ----------
create table if not exists public.products (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  category text not null,
  quantity numeric not null check (quantity >= 0),
  unit text not null,
  purchase_date date,
  expiration_date date,
  storage_location text not null check (storage_location in ('Refrigerator','Freezer','Pantry')),
  image_url text,
  notes text,
  estimated_price numeric check (estimated_price is null or estimated_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_user_exp_idx on public.products (user_id, expiration_date);

-- ---------- shopping ----------
create table if not exists public.shopping_lists (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My shopping list',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_items (
  id text primary key,
  list_id text not null references public.shopping_lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_name text not null,
  category text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  estimated_price numeric,
  purchased boolean not null default false,
  source text not null default 'manual' check (source in ('manual','recipe','suggestion')),
  created_at timestamptz not null default now()
);
create index if not exists shopping_items_user_idx on public.shopping_items (user_id, purchased);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  store_name text not null,
  total_amount numeric not null check (total_amount >= 0),
  purchase_date date not null,
  receipt_image_url text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, purchase_date desc);

create table if not exists public.transaction_items (
  id text primary key,
  transaction_id text not null references public.transactions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  category text not null
);
create index if not exists transaction_items_tx_idx on public.transaction_items (transaction_id);

-- ---------- recipes ----------
-- Shared recipe library (read-only for users). The app also ships the same library in code.
create table if not exists public.recipes (
  id text primary key,
  name text not null,
  description text not null default '',
  cuisine text not null default '',
  preparation_time int not null,
  difficulty text not null default 'Easy',
  servings int not null default 1,
  calories int not null,
  protein numeric not null,
  carbohydrates numeric not null,
  fat numeric not null,
  ingredients jsonb not null,
  instructions jsonb not null,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  palette text[] not null default '{}'
);

-- AI recipes a user generated and kept.
create table if not exists public.user_recipes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  cuisine text not null default '',
  preparation_time int not null,
  difficulty text not null default 'Easy',
  servings int not null default 1,
  calories numeric not null,
  protein numeric not null,
  carbohydrates numeric not null,
  fat numeric not null,
  ingredients jsonb not null,
  instructions jsonb not null,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  palette text[] not null default '{}',
  source text default 'ai',
  created_at timestamptz not null default now()
);

create table if not exists public.saved_recipes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create table if not exists public.recipe_ratings (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id text not null,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

-- ---------- logs ----------
create table if not exists public.meal_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id text,
  meal_name text not null,
  serving_size numeric not null default 1,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbohydrates numeric not null default 0,
  fat numeric not null default 0,
  is_estimate boolean not null default false,
  consumed_at timestamptz not null default now()
);
create index if not exists meal_logs_user_time_idx on public.meal_logs (user_id, consumed_at desc);

create table if not exists public.food_waste_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text,
  product_name text not null,
  quantity numeric not null,
  estimated_value numeric not null default 0,
  reason text not null default 'Not specified',
  created_at timestamptz not null default now()
);

create table if not exists public.usage_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text,
  product_name text not null,
  quantity numeric not null,
  estimated_value numeric not null default 0,
  used_before_expiry boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.water_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml int not null check (amount_ml > 0 and amount_ml <= 3000),
  logged_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  reminder_time text not null check (reminder_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  repeat_days int[] not null default '{0,1,2,3,4,5,6}',
  notes text,
  enabled boolean not null default true,
  last_done_on date
);

-- ---------- coupons ----------
-- Coupons are global. Demo coupons are clearly flagged with is_demo = true.
create table if not exists public.coupons (
  id text primary key,
  store_name text not null,
  product_name text not null,
  discount text not null,
  expiration_date date not null,
  description text not null default '',
  conditions text not null default '',
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_saves (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  coupon_id text not null references public.coupons (id) on delete cascade,
  status text not null default 'saved' check (status in ('saved','used')),
  created_at timestamptz not null default now(),
  unique (user_id, coupon_id)
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
create policy "profiles: own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['user_preferences','products','shopping_lists','shopping_items','transactions','transaction_items',
    'user_recipes','saved_recipes','recipe_ratings','meal_logs','food_waste_logs','usage_logs','water_logs','reminders','coupon_saves']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;

alter table public.recipes enable row level security;
create policy "recipes: readable by signed-in users" on public.recipes for select to authenticated using (true);
alter table public.coupons enable row level security;
create policy "coupons: readable by signed-in users" on public.coupons for select to authenticated using (true);

-- ---------- account deletion ----------
-- Lets a signed-in user delete their own auth account (all rows cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from storage.objects where bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- storage: private bucket, one folder per user ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "uploads: read own" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "uploads: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "uploads: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
