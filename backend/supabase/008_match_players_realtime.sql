-- Allow hosts to receive live updates for participants in their own matches.
create or replace function public.is_match_host(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches
    where id = p_match_id
      and created_by = auth.uid()
  );
$$;

revoke all on function public.is_match_host(uuid) from public;
grant execute on function public.is_match_host(uuid) to authenticated;

alter table public.match_players enable row level security;
grant select on public.match_players to authenticated;

drop policy if exists "Hosts can read players in their matches" on public.match_players;
create policy "Hosts can read players in their matches"
  on public.match_players for select
  to authenticated
  using (public.is_match_host(match_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_players'
  ) then
    alter publication supabase_realtime add table public.match_players;
  end if;
end
$$;
