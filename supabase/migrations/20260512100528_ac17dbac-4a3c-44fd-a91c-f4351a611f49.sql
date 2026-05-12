-- Function that returns team member ids for a given team leader, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_team_member_ids(_leader_id uuid)
RETURNS TABLE(member_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.member_id
  FROM public.team_members tm
  WHERE tm.team_leader_id = _leader_id;
$$;