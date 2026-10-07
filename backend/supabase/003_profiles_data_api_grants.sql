-- Required as of Supabase's Oct 30, 2026 Data API grant change.
-- Without this, supabase-js calls to `profiles` fail with "permission denied"
-- regardless of RLS policy correctness — GRANT and RLS are separate layers.
grant select, update
on public.profiles
to authenticated;
