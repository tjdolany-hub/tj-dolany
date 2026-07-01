-- Fix (High): an editor could escalate to admin by calling PostgREST directly.
--
-- Migration 024's "Users can update their own profile" policy restricts WHICH
-- row a user may update (their own) but not WHICH columns. The `role` column is
-- therefore freely writable by the row owner via the public REST API with the
-- anon key + their own access token, bypassing the app's requireAdmin() checks.
--
-- Fix: a BEFORE UPDATE trigger that rejects any change to `role` unless the
-- statement runs as service_role (i.e. through the /api/users/* admin routes,
-- which use the service-role key). The trigger runs with the invoker's role, so
-- current_user reflects the PostgREST-set role (authenticated | service_role).

create or replace function public.enforce_profile_role_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and current_user <> 'service_role' then
    raise exception 'Changing profile.role is only allowed via service_role';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role_immutable on public.profiles;

create trigger enforce_profile_role_immutable
  before update on public.profiles
  for each row execute function public.enforce_profile_role_immutable();
