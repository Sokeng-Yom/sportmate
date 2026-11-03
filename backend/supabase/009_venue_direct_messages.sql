-- Private 1:1 messages between a venue owner and the host of a match booked at that venue.
-- Run in the Supabase SQL Editor for each environment.

create or replace function public.is_venue_direct_message_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_direct_conversations c
    where c.id = p_conversation_id
      and auth.uid() in (c.owner_id, c.host_id)
  );
$$;
revoke all on function public.is_venue_direct_message_participant(uuid) from public;
grant execute on function public.is_venue_direct_message_participant(uuid) to authenticated;

alter table public.venue_direct_conversations enable row level security;
drop policy if exists "Direct conversation participants can read conversations"
  on public.venue_direct_conversations;
create policy "Direct conversation participants can read conversations"
  on public.venue_direct_conversations for select
  to authenticated
  using (auth.uid() in (owner_id, host_id));
grant select on public.venue_direct_conversations to authenticated;

alter table public.venue_direct_messages enable row level security;
drop policy if exists "Direct conversation participants can read messages"
  on public.venue_direct_messages;
create policy "Direct conversation participants can read messages"
  on public.venue_direct_messages for select
  to authenticated
  using (public.is_venue_direct_message_participant(conversation_id));
grant select on public.venue_direct_messages to authenticated;

alter table public.venue_direct_read_states enable row level security;
revoke all on public.venue_direct_read_states from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'venue_direct_messages'
  ) then
    alter publication supabase_realtime add table public.venue_direct_messages;
  end if;
end
$$;
