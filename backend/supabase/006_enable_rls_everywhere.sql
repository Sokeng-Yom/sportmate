-- Deny-by-default: with RLS on and no policy, the public Data API returns nothing for a table.
-- FastAPI connects as the owner role, which bypasses RLS. Tables that need frontend reads
-- (profiles, messages) already have explicit policies. Safe to re-run.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end
$$;
