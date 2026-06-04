revoke execute on function public.has_paid_access(uuid, text) from public, anon, authenticated;
grant execute on function public.has_paid_access(uuid, text) to service_role;