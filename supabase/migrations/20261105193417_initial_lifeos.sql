-- Canonical schema v1. Initial migration generated with Supabase CLI 2.108.0.
-- For existing deployments use additive migrations. See docs/SETUP.md.
begin;
create table public.lifeos_records (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 kind text not null check (kind in ('task','project','habit','habitLog','note','contact','application','shortcut','codex','focus','review','reminder','milestone','interaction')),
 schema_version integer not null default 1 check(schema_version=1),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=100000),
 version bigint not null default 1 check(version>0),
 deleted boolean not null default false,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(user_id,id),
 check (kind='habitLog' or coalesce((jsonb_typeof(data->'title')='string' and length(btrim(data->>'title')) between 1 and 240),false))
);
create index lifeos_records_kind on public.lifeos_records(user_id,kind,deleted);
create index lifeos_records_changes on public.lifeos_records(user_id,updated_at,id);
create index lifeos_records_project on public.lifeos_records(user_id,(data->>'projectId')) where not deleted;
alter table public.lifeos_records enable row level security;
create policy records_read on public.lifeos_records for select to authenticated
 using ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
create policy records_insert on public.lifeos_records for insert to authenticated
 with check ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
create policy records_update on public.lifeos_records for update to authenticated
 using ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true')
 with check ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
revoke all on public.lifeos_records from public,anon,authenticated;
grant select,insert,update on public.lifeos_records to authenticated;

create function public.lifeos_validate_record() returns trigger language plpgsql security invoker set search_path='' as $$
declare ref_id uuid;ref_kind text;
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id or new.kind<>old.kind or new.version<>old.version+1 then raise exception 'Immutable identity or stale version';end if;
 elsif new.version<>1 then raise exception 'New record must start at version 1';end if;
 if new.kind='task' and (new.data->>'status' is null or new.data->>'status' not in ('inbox','planned','in_progress','completed','skipped','cancelled')) then raise exception 'Invalid task status';end if;
 if new.kind='reminder' then
  if new.data->>'status' is null or new.data->>'status' not in ('pending','delivered','completed','cancelled') then raise exception 'Invalid reminder status';end if;
  if new.data->>'fireAt' is null then raise exception 'Missing reminder instant';end if;
  perform (new.data->>'fireAt')::timestamptz;
 end if;
 -- Soft deletion keeps referenced records available. Each relationship is owner-scoped.
 for ref_kind,ref_id in select x.kind,x.id::uuid from (values
  ('project',new.data->>'projectId'),('task',new.data->>'taskId'),
  ('habit',new.data->>'habitId'),('contact',new.data->>'contactId'),
  ('milestone',new.data->>'milestoneId'),('task',new.data->>'seriesId'),('focus',new.data->>'focusId')) x(kind,id) where x.id is not null
 loop
  if not exists(select 1 from public.lifeos_records r where r.user_id=new.user_id and r.id=ref_id and r.kind=ref_kind) then raise exception 'Missing owner-scoped % reference',ref_kind;end if;
 end loop;
 new.updated_at=clock_timestamp();return new;
end $$;
create trigger validate_lifeos_record before insert or update on public.lifeos_records for each row execute function public.lifeos_validate_record();

create function public.lifeos_push(p_id uuid,p_kind text,p_data jsonb,p_deleted boolean,p_expected bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_row public.lifeos_records;owner_id uuid:=auth.uid();
begin
 if owner_id is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Authenticated owner required';end if;
 if p_expected<0 then raise exception 'Invalid expected version';end if;
 select * into current_row from public.lifeos_records where user_id=owner_id and id=p_id for update;
 if not found then
  if p_expected<>0 then raise exception 'Remote record missing; explicit recovery required';end if;
  begin
   insert into public.lifeos_records(user_id,id,kind,data,deleted) values(owner_id,p_id,p_kind,p_data,p_deleted) returning * into current_row;
   return jsonb_build_object('ok',true,'record',to_jsonb(current_row));
  exception when unique_violation then
   select * into current_row from public.lifeos_records where user_id=owner_id and id=p_id for update;
  end;
 end if;
 if current_row.kind<>p_kind then raise exception 'Record kind cannot change';end if;
 -- A retry after a successful push is an acknowledgement, not a second mutation.
 if current_row.data=p_data and current_row.deleted=p_deleted then return jsonb_build_object('ok',true,'record',to_jsonb(current_row));end if;
 if current_row.version<>p_expected then return jsonb_build_object('ok',false,'record',to_jsonb(current_row));end if;
 update public.lifeos_records set data=p_data,deleted=p_deleted,version=version+1 where user_id=owner_id and id=p_id returning * into current_row;
 return jsonb_build_object('ok',true,'record',to_jsonb(current_row));
end $$;
revoke all on function public.lifeos_push(uuid,text,jsonb,boolean,bigint) from public,anon;
grant execute on function public.lifeos_push(uuid,text,jsonb,boolean,bigint) to authenticated;
revoke all on function public.lifeos_validate_record() from public,anon,authenticated;
commit;

