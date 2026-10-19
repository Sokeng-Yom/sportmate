-- Run in the Supabase SQL Editor for sportmate-dev (and sportmate-test). Safe to re-run.

-- 1. Who may read a conversation's messages: the match creator and the players of the match.
--    SECURITY DEFINER lets the policy look at matches / match_players without exposing them
--    to the Data API.
create or replace function public.is_match_chat_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.matches m on m.id = c.match_id
    where c.id = p_conversation_id
      and (
        m.created_by = auth.uid()
        or exists (
          select 1 from public.match_players mp
          where mp.match_id = m.id and mp.user_id = auth.uid()
        )
      )
  );
$$;
revoke all on function public.is_match_chat_participant(uuid) from public;
grant execute on function public.is_match_chat_participant(uuid) to authenticated;

-- 2. Remove EVERY existing policy on messages (including the old conversation_members one)
alter table public.messages enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'messages'
  loop
    execute format('drop policy %I on public.messages', p.policyname);
  end loop;
end
$$;

-- 3. Reads allowed for participants only. There is deliberately NO insert/update/delete
--    policy: messages are written by FastAPI only.
create policy "Participants can read match messages"
  on public.messages for select
  to authenticated
  using (public.is_match_chat_participant(conversation_id));

-- 4. Data API grant (required for new tables since Supabase's Oct 30, 2026 change)
grant select on public.messages to authenticated;

-- 5. Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
