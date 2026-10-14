-- SECURITY FIX. The original trigger trusted the role sent by the browser at sign-up,
-- so anyone could register as ADMIN. Only PLAYER and VENUE_OWNER are self-selectable;
-- ADMIN accounts are created by the system only (see the update statement below).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'PLAYER');
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    case when requested_role in ('PLAYER', 'VENUE_OWNER') then requested_role else 'PLAYER' end
  );
  return new;
end;
$$;

-- To make someone an admin (run manually, never from the app):
-- update public.profiles set role = 'ADMIN' where id = '<user uuid>';
